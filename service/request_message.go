package service

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/samber/lo"
)

// 单条请求记录的用户输入总上限（字节）。超出后丢弃更早的消息并标记截断，
// 防止超长对话历史撑爆 text 列（MySQL TEXT 上限 64KB）。
const maxUserContentBytes = 60 * 1024

// 单段清洗后的用户输入展示上限（字节）。超过后保留前缀并标记截断，
// 避免把客户端注入的大段上下文写入请求内容日志。
const maxSingleUserContentBytes = 8 * 1024

const truncatedMarker = "...[truncated]"

// 多模态非文本部分的占位符
const (
	placeholderImage = "[image]"
	placeholderAudio = "[audio]"
	placeholderFile  = "[file]"
	placeholderVideo = "[video]"
)

// 客户端（Claude Code、Cursor、Codex 等）注入内容的两类特征：
//
// injectedTagNames 是成对标签，注入内容包裹在 <tag ...>...</tag> 区段中，
// 且常与用户真实输入混在同一文本块里（如 Cursor 把 <user_info>、<rules> 等
// 塞在用户问题前面）。对这类只剥离标签区段，保留剩余的真实输入。
//
// injectedBlockMarkers 是无闭合结构的特征，无法界定注入范围，
// 包含任一特征的整个文本块直接丢弃。
var injectedTagNames = []string{
	"environment_context",
	"system-reminder",
	"ide_selection",
	"ide_opened_file",
	"cursorRules",
	"instructions",
	"context_management",
	"user_info",
	"ide_state",
	"rules",
	"user_rule",
	"available_skills",
	"mcp_instructions",
	"agent_transcripts",
	"appshot",
	"codex_internal_context",
}

var injectedBlockMarkers = []string{
	"<|system|>",
	"CRITICAL: Respond with TEXT ONLY",
	"--- CONTEXT ENTRY BEGIN ---",
	"Base directory for this skill:",
	"# Subagent-Driven Development",
	"This session is being continued from a previous conversation that ran out of context.",
	"Another language model started to solve this problem",
}

var injectedBlockPrefixes = []string{
	"# AGENTS.md instructions",
}

const continuedSessionResumeMarker = "Pick up the last task as if the break never happened."

var codexUserRequestLinePattern = regexp.MustCompile(`(?i)^\s*(?:#{1,6}\s*)?My request for Codex:\s*$`)

// Go 的 RE2 不支持反向引用，为保证开闭标签配对，每个标签编译独立正则。
// (?is) 忽略大小写且 . 匹配换行；`\z` 兜底处理被截断的未闭合区段。
var injectedTagPatterns = func() []*regexp.Regexp {
	patterns := make([]*regexp.Regexp, len(injectedTagNames))
	for i, name := range injectedTagNames {
		patterns[i] = regexp.MustCompile(`(?is)<` + name + `(\s[^>]*)?>.*?(</` + name + `>|\z)`)
	}
	return patterns
}()

// userQueryPattern 匹配 Cursor 等客户端用来包裹用户真实输入的 <user_query> 区段。
// 存在该包裹时，包裹外的内容全部是注入上下文，真实输入即区段内部内容。
var userQueryPattern = regexp.MustCompile(`(?is)<user_query(?:\s[^>]*)?>(.*?)(?:</user_query>|\z)`)

// orphanInjectedClosingTagPattern 清理客户端续聊/拼接时泄露到用户区块中的孤立闭合标签。
var orphanInjectedClosingTagPattern = func() *regexp.Regexp {
	patterns := make([]string, 0, len(injectedTagNames)+1)
	for _, name := range injectedTagNames {
		patterns = append(patterns, regexp.QuoteMeta(name))
	}
	patterns = append(patterns, "system_reminder")
	return regexp.MustCompile(`(?im)^\s*</(?:` + strings.Join(patterns, "|") + `)>\s*$\n?`)
}()

// filterUserText 去除文本块中客户端注入的内容，返回剩余的用户真实输入；
// 整块均为注入内容时返回空串。
func filterUserText(text string) string {
	if text == "" {
		return ""
	}
	if isInjectedBlock(text) {
		return ""
	}
	if strings.Contains(text, "<user_query") {
		var queries []string
		for _, match := range userQueryPattern.FindAllStringSubmatch(text, -1) {
			if query := cleanUserQueryText(match[1]); query != "" {
				queries = append(queries, query)
			}
		}
		return normalizeFilteredUserText(strings.Join(queries, "\n"))
	}
	text = stripInjectedTags(text)
	if query, ok := extractCodexUserRequestText(text); ok {
		return normalizeFilteredUserText(query)
	}
	return normalizeFilteredUserText(text)
}

func isInjectedBlock(text string) bool {
	trimmedText := strings.TrimSpace(text)
	for _, prefix := range injectedBlockPrefixes {
		if strings.HasPrefix(trimmedText, prefix) {
			return true
		}
	}
	for _, marker := range injectedBlockMarkers {
		if strings.Contains(text, marker) {
			return true
		}
	}
	return false
}

func cleanUserQueryText(text string) string {
	text = stripInjectedTags(text)
	if isInjectedBlock(text) {
		return ""
	}
	if markerIndex := strings.Index(text, continuedSessionResumeMarker); markerIndex >= 0 {
		text = text[markerIndex+len(continuedSessionResumeMarker):]
	}
	if query, ok := extractCodexUserRequestText(text); ok {
		text = query
	}
	text = orphanInjectedClosingTagPattern.ReplaceAllString(text, "")
	return strings.TrimSpace(text)
}

func extractCodexUserRequestText(text string) (string, bool) {
	lines := strings.Split(text, "\n")
	for lineIndex, line := range lines {
		if codexUserRequestLinePattern.MatchString(line) {
			return strings.TrimSpace(strings.Join(lines[lineIndex+1:], "\n")), true
		}
	}
	return "", false
}

func normalizeFilteredUserText(text string) string {
	text = strings.TrimSpace(text)
	if len(text) <= maxSingleUserContentBytes {
		return text
	}
	return truncateTextWithMarker(text, maxSingleUserContentBytes)
}

func truncateTextWithMarker(text string, maxBytes int) string {
	if maxBytes <= len(truncatedMarker) {
		return truncatedMarker[:maxBytes]
	}
	remainingBytes := maxBytes - len(truncatedMarker)
	truncatedEnd := 0
	for index, currentRune := range text {
		nextEnd := index + len(string(currentRune))
		if nextEnd > remainingBytes {
			break
		}
		truncatedEnd = nextEnd
	}
	return text[:truncatedEnd] + truncatedMarker
}

func stripInjectedTags(text string) string {
	stripped := false
	for _, pattern := range injectedTagPatterns {
		cleanedText := pattern.ReplaceAllString(text, "")
		if cleanedText != text {
			text = cleanedText
			stripped = true
		}
	}
	cleanedText := orphanInjectedClosingTagPattern.ReplaceAllString(text, "")
	if stripped || cleanedText != text {
		return strings.TrimSpace(cleanedText)
	}
	return text
}

// RecordRequestMessage 提取请求中的用户输入与模型参数并异步入库。
// 提取在当前 goroutine 完成（避免与后续对请求 DTO 的修改产生数据竞争），
// 数据库写入异步执行，不阻塞请求热路径。
func RecordRequestMessage(relayInfo *relaycommon.RelayInfo, request dto.Request) {
	if !common.RecordRequestMessageEnabled || relayInfo == nil || request == nil {
		return
	}

	var messages []string
	var parameters map[string]any
	switch r := request.(type) {
	case *dto.GeneralOpenAIRequest:
		messages = extractOpenAIUserMessages(r)
		parameters = buildOpenAIParameters(r)
	case *dto.ClaudeRequest:
		messages = extractClaudeUserMessages(r)
		parameters = buildClaudeParameters(r)
	case *dto.GeminiChatRequest:
		messages = extractGeminiUserMessages(r)
		parameters = buildGeminiParameters(r)
	case *dto.OpenAIResponsesRequest:
		messages = extractResponsesUserMessages(r)
		parameters = buildResponsesParameters(r)
	default:
		return
	}
	if len(messages) == 0 {
		return
	}

	messages = truncateUserMessages(messages)
	parameters["model"] = relayInfo.OriginModelName
	parameters["stream"] = relayInfo.IsStream

	userContent, err := common.Marshal(messages)
	if err != nil {
		return
	}
	parametersJson, err := common.Marshal(parameters)
	if err != nil {
		return
	}

	record := &model.RequestMessage{
		RequestId:   relayInfo.RequestId,
		UserId:      relayInfo.UserId,
		TokenId:     relayInfo.TokenId,
		ModelName:   relayInfo.OriginModelName,
		RelayFormat: string(relayInfo.RelayFormat),
		CreatedAt:   common.GetTimestamp(),
		UserContent: string(userContent),
		Parameters:  string(parametersJson),
	}
	gopool.Go(func() {
		model.InsertRequestMessage(record)
	})
}

// truncateUserMessages 在超出总大小上限时优先保留最新的消息
// （前端默认展示最新一条，价值最高），被裁剪的历史用截断标记替代。
func truncateUserMessages(messages []string) []string {
	total := 0
	start := len(messages)
	for start > 0 && total+len(messages[start-1]) <= maxUserContentBytes {
		start--
		total += len(messages[start])
	}
	if start == 0 {
		return messages
	}
	if start == len(messages) {
		// 最新一条消息自身超限，保留其尾部
		last := messages[len(messages)-1]
		return []string{truncatedMarker + last[len(last)-(maxUserContentBytes-len(truncatedMarker)):]}
	}
	return append([]string{truncatedMarker}, messages[start:]...)
}

func extractOpenAIUserMessages(r *dto.GeneralOpenAIRequest) []string {
	var messages []string
	for i := range r.Messages {
		message := &r.Messages[i]
		if message.Role != "user" {
			continue
		}
		var parts []string
		for _, content := range message.ParseContent() {
			switch content.Type {
			case dto.ContentTypeText:
				if text := filterUserText(content.Text); text != "" {
					parts = append(parts, text)
				}
			case dto.ContentTypeImageURL:
				parts = append(parts, placeholderImage)
			case dto.ContentTypeInputAudio:
				parts = append(parts, placeholderAudio)
			case dto.ContentTypeFile:
				parts = append(parts, placeholderFile)
			case dto.ContentTypeVideoUrl:
				parts = append(parts, placeholderVideo)
			}
		}
		if len(parts) > 0 {
			messages = append(messages, strings.Join(parts, "\n"))
		}
	}
	return messages
}

func extractClaudeUserMessages(r *dto.ClaudeRequest) []string {
	var messages []string
	for i := range r.Messages {
		message := &r.Messages[i]
		if message.Role != "user" {
			continue
		}
		if message.IsStringContent() {
			if text := filterUserText(message.GetStringContent()); text != "" {
				messages = append(messages, text)
			}
			continue
		}
		blocks, err := message.ParseContent()
		if err != nil {
			continue
		}
		var parts []string
		for _, block := range blocks {
			switch block.Type {
			case "text":
				if text := filterUserText(block.GetText()); text != "" {
					parts = append(parts, text)
				}
			case "image":
				parts = append(parts, placeholderImage)
			case "document":
				parts = append(parts, placeholderFile)
				// tool_result、thinking 等块不属于用户真实输入，跳过
			}
		}
		if len(parts) > 0 {
			messages = append(messages, strings.Join(parts, "\n"))
		}
	}
	return messages
}

func extractGeminiUserMessages(r *dto.GeminiChatRequest) []string {
	var messages []string
	for _, content := range r.Contents {
		// Gemini 中 role 缺省视为 user
		if content.Role != "" && content.Role != "user" {
			continue
		}
		var parts []string
		for _, part := range content.Parts {
			switch {
			case part.Text != "" && !part.Thought:
				if text := filterUserText(part.Text); text != "" {
					parts = append(parts, text)
				}
			case part.InlineData != nil:
				parts = append(parts, placeholderForMimeType(part.InlineData.MimeType))
			case part.FileData != nil:
				parts = append(parts, placeholderForMimeType(part.FileData.MimeType))
				// functionResponse 等部分不属于用户真实输入，跳过
			}
		}
		if len(parts) > 0 {
			messages = append(messages, strings.Join(parts, "\n"))
		}
	}
	return messages
}

func placeholderForMimeType(mimeType string) string {
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return placeholderImage
	case strings.HasPrefix(mimeType, "audio/"):
		return placeholderAudio
	case strings.HasPrefix(mimeType, "video/"):
		return placeholderVideo
	default:
		return placeholderFile
	}
}

func extractResponsesUserMessages(r *dto.OpenAIResponsesRequest) []string {
	if len(r.Input) == 0 {
		return nil
	}
	var inputText string
	if err := common.Unmarshal(r.Input, &inputText); err == nil {
		if text := filterUserText(inputText); text != "" {
			return []string{text}
		}
		return nil
	}

	var items []struct {
		Type    string          `json:"type,omitempty"`
		Role    string          `json:"role,omitempty"`
		Content json.RawMessage `json:"content,omitempty"`
	}
	if err := common.Unmarshal(r.Input, &items); err != nil {
		return nil
	}
	var messages []string
	for _, item := range items {
		if item.Role != "user" || len(item.Content) == 0 {
			continue
		}
		var contentText string
		if err := common.Unmarshal(item.Content, &contentText); err == nil {
			if text := filterUserText(contentText); text != "" {
				messages = append(messages, text)
			}
			continue
		}
		var blocks []dto.MediaInput
		if err := common.Unmarshal(item.Content, &blocks); err != nil {
			continue
		}
		var parts []string
		for _, block := range blocks {
			switch block.Type {
			case "input_text":
				if text := filterUserText(block.Text); text != "" {
					parts = append(parts, text)
				}
			case "input_image":
				parts = append(parts, placeholderImage)
			case "input_file":
				parts = append(parts, placeholderFile)
			}
		}
		if len(parts) > 0 {
			messages = append(messages, strings.Join(parts, "\n"))
		}
	}
	return messages
}

// setIfNotNil 将非 nil 指针的值写入参数表，保持“客户端未传的字段不记录”的语义。
func setIfNotNil[T any](params map[string]any, key string, value *T) {
	if value != nil {
		params[key] = *value
	}
}

func buildOpenAIParameters(r *dto.GeneralOpenAIRequest) map[string]any {
	params := map[string]any{}
	if maxTokens := r.GetMaxTokens(); maxTokens > 0 {
		params["max_tokens"] = maxTokens
	}
	setIfNotNil(params, "temperature", r.Temperature)
	setIfNotNil(params, "top_p", r.TopP)
	setIfNotNil(params, "top_k", r.TopK)
	setIfNotNil(params, "frequency_penalty", r.FrequencyPenalty)
	setIfNotNil(params, "presence_penalty", r.PresencePenalty)
	setIfNotNil(params, "seed", r.Seed)
	setIfNotNil(params, "n", r.N)
	if r.ReasoningEffort != "" {
		params["reasoning_effort"] = r.ReasoningEffort
	}
	if r.Stop != nil {
		params["stop"] = r.Stop
	}
	if len(r.Tools) > 0 {
		params["tools"] = lo.Map(r.Tools, func(tool dto.ToolCallRequest, _ int) string {
			return tool.Function.Name
		})
	}
	return params
}

func buildClaudeParameters(r *dto.ClaudeRequest) map[string]any {
	params := map[string]any{}
	if maxTokens := lo.FromPtrOr(r.MaxTokens, lo.FromPtrOr(r.MaxTokensToSample, 0)); maxTokens > 0 {
		params["max_tokens"] = maxTokens
	}
	setIfNotNil(params, "temperature", r.Temperature)
	setIfNotNil(params, "top_p", r.TopP)
	setIfNotNil(params, "top_k", r.TopK)
	if effort := r.GetEfforts(); effort != "" {
		params["reasoning_effort"] = effort
	}
	if len(r.StopSequences) > 0 {
		params["stop"] = r.StopSequences
	}
	if tools := r.GetTools(); len(tools) > 0 {
		var names []string
		for _, tool := range tools {
			if toolMap, ok := tool.(map[string]any); ok {
				if name := common.Interface2String(toolMap["name"]); name != "" {
					names = append(names, name)
				}
			}
		}
		if len(names) > 0 {
			params["tools"] = names
		}
	}
	if len(r.McpServers) > 0 {
		var servers []struct {
			Name string `json:"name"`
		}
		if err := common.Unmarshal(r.McpServers, &servers); err == nil {
			names := make([]string, 0, len(servers))
			for _, server := range servers {
				if server.Name != "" {
					names = append(names, server.Name)
				}
			}
			if len(names) > 0 {
				params["mcp_servers"] = names
			}
		}
	}
	return params
}

func buildGeminiParameters(r *dto.GeminiChatRequest) map[string]any {
	params := map[string]any{}
	config := r.GenerationConfig
	setIfNotNil(params, "temperature", config.Temperature)
	setIfNotNil(params, "top_p", config.TopP)
	setIfNotNil(params, "top_k", config.TopK)
	setIfNotNil(params, "frequency_penalty", config.FrequencyPenalty)
	setIfNotNil(params, "presence_penalty", config.PresencePenalty)
	setIfNotNil(params, "seed", config.Seed)
	setIfNotNil(params, "n", config.CandidateCount)
	if maxTokens := lo.FromPtrOr(config.MaxOutputTokens, 0); maxTokens > 0 {
		params["max_tokens"] = maxTokens
	}
	if len(config.StopSequences) > 0 {
		params["stop"] = config.StopSequences
	}
	var toolNames []string
	for _, tool := range r.GetTools() {
		if declarations, ok := tool.FunctionDeclarations.([]any); ok {
			for _, declaration := range declarations {
				if declarationMap, ok := declaration.(map[string]any); ok {
					if name := common.Interface2String(declarationMap["name"]); name != "" {
						toolNames = append(toolNames, name)
					}
				}
			}
		}
	}
	if len(toolNames) > 0 {
		params["tools"] = toolNames
	}
	return params
}

func buildResponsesParameters(r *dto.OpenAIResponsesRequest) map[string]any {
	params := map[string]any{}
	if maxTokens := lo.FromPtrOr(r.MaxOutputTokens, uint(0)); maxTokens > 0 {
		params["max_tokens"] = maxTokens
	}
	setIfNotNil(params, "temperature", r.Temperature)
	setIfNotNil(params, "top_p", r.TopP)
	if r.Reasoning != nil && r.Reasoning.Effort != "" {
		params["reasoning_effort"] = r.Reasoning.Effort
	}
	var toolNames, mcpServers []string
	for _, tool := range r.GetToolsMap() {
		toolType := common.Interface2String(tool["type"])
		if toolType == "mcp" {
			if label := common.Interface2String(tool["server_label"]); label != "" {
				mcpServers = append(mcpServers, label)
			}
			continue
		}
		name := common.Interface2String(tool["name"])
		if name == "" {
			name = toolType
		}
		if name != "" {
			toolNames = append(toolNames, name)
		}
	}
	if len(toolNames) > 0 {
		params["tools"] = toolNames
	}
	if len(mcpServers) > 0 {
		params["mcp_servers"] = mcpServers
	}
	return params
}
