package model

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"

	"gorm.io/gorm"
)

func applyExplicitLogTextFilter(tx *gorm.DB, column string, value string) (*gorm.DB, error) {
	if value == "" {
		return tx, nil
	}
	if strings.Contains(value, "%") {
		condition, pattern, err := buildLogLikeCondition(column, value)
		if err != nil {
			return nil, err
		}
		return tx.Where(condition, pattern), nil
	}
	return tx.Where(column+" = ?", value), nil
}

func applyLogUserKeywordFilter(tx *gorm.DB, keyword string, logUsernameColumn string) (*gorm.DB, error) {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return tx, nil
	}

	logCondition, logPattern, err := buildLogContainsCondition(logUsernameColumn, keyword, common.LogDatabaseType())
	if err != nil {
		return nil, err
	}

	userCondition, userPattern, err := buildLogContainsCondition("username", keyword, common.MainDatabaseType())
	if err != nil {
		return nil, err
	}
	displayNameCondition, displayNamePattern, err := buildLogContainsCondition("display_name", keyword, common.MainDatabaseType())
	if err != nil {
		return nil, err
	}

	var matchedUsers []struct {
		Id       int    `gorm:"column:id"`
		Username string `gorm:"column:username"`
	}
	if err = DB.Table("users").Select("id, username").Where(
		"("+userCondition+") OR ("+displayNameCondition+")",
		userPattern,
		displayNamePattern,
	).Find(&matchedUsers).Error; err != nil {
		return nil, err
	}

	matchedUserIds := make([]int, 0, len(matchedUsers))
	matchedUsernames := make([]string, 0, len(matchedUsers))
	for _, matchedUser := range matchedUsers {
		if matchedUser.Id != 0 {
			matchedUserIds = append(matchedUserIds, matchedUser.Id)
		}
		if matchedUser.Username != "" {
			matchedUsernames = append(matchedUsernames, matchedUser.Username)
		}
	}

	if len(matchedUserIds) == 0 && len(matchedUsernames) == 0 {
		return tx.Where(logCondition, logPattern), nil
	}

	return tx.Where(
		"("+logCondition+") OR logs.user_id IN ? OR "+logUsernameColumn+" IN ?",
		logPattern,
		matchedUserIds,
		matchedUsernames,
	), nil
}

func buildLogContainsCondition(column string, value string, databaseType common.DatabaseType) (string, string, error) {
	pattern, err := sanitizeContainsLikePattern(value, databaseType)
	if err != nil {
		return "", "", err
	}
	if databaseType == common.DatabaseTypeClickHouse {
		return column + " LIKE ?", pattern, nil
	}
	return column + " LIKE ? ESCAPE '!'", pattern, nil
}

func sanitizeContainsLikePattern(input string, databaseType common.DatabaseType) (string, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", nil
	}
	if databaseType == common.DatabaseTypeClickHouse {
		input = strings.ReplaceAll(input, `\`, `\\`)
		input = strings.ReplaceAll(input, `%`, `\%`)
		input = strings.ReplaceAll(input, `_`, `\_`)
		return "%" + input + "%", nil
	}
	input = strings.ReplaceAll(input, "!", "!!")
	input = strings.ReplaceAll(input, `%`, `!%`)
	input = strings.ReplaceAll(input, `_`, `!_`)
	return "%" + input + "%", nil
}

func buildLogLikeCondition(column string, value string) (string, string, error) {
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		pattern, err := sanitizeClickHouseLikePattern(value)
		if err != nil {
			return "", "", err
		}
		return column + " LIKE ?", pattern, nil
	}

	pattern, err := sanitizeLikePattern(value)
	if err != nil {
		return "", "", err
	}
	return column + " LIKE ? ESCAPE '!'", pattern, nil
}

func sanitizeClickHouseLikePattern(input string) (string, error) {
	input = strings.ReplaceAll(input, `\`, `\\`)
	input = strings.ReplaceAll(input, `_`, `\_`)

	if err := validateLikePattern(input); err != nil {
		return "", err
	}
	return input, nil
}

type Log struct {
	Id                int    `json:"id" gorm:"index:idx_created_at_id,priority:2;index:idx_user_id_id,priority:2"`
	UserId            int    `json:"user_id" gorm:"index;index:idx_user_id_id,priority:1"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint;index:idx_created_at_id,priority:1;index:idx_created_at_type"`
	Type              int    `json:"type" gorm:"index:idx_created_at_type"`
	Content           string `json:"content"`
	Username          string `json:"username" gorm:"index;index:index_username_model_name,priority:2;default:''"`
	TokenName         string `json:"token_name" gorm:"index;default:''"`
	ModelName         string `json:"model_name" gorm:"index;index:index_username_model_name,priority:1;default:''"`
	Quota             int    `json:"quota" gorm:"default:0"`
	PromptTokens      int    `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens  int    `json:"completion_tokens" gorm:"default:0"`
	UseTime           int    `json:"use_time" gorm:"default:0"`
	IsStream          bool   `json:"is_stream"`
	ChannelId         int    `json:"channel" gorm:"index"`
	ChannelName       string `json:"channel_name" gorm:"->"`
	DisplayName       string `json:"display_name" gorm:"->"`
	AvatarUrl         string `json:"avatar_url" gorm:"->"`
	OpenId            string `json:"open_id" gorm:"->"`
	TokenId           int    `json:"token_id" gorm:"default:0;index"`
	Group             string `json:"group" gorm:"index"`
	Ip                string `json:"ip" gorm:"index;default:''"`
	RequestId         string `json:"request_id,omitempty" gorm:"type:varchar(64);index:idx_logs_request_id;default:''"`
	UpstreamRequestId string `json:"upstream_request_id,omitempty" gorm:"type:varchar(128);index:idx_logs_upstream_request_id;default:''"`
	Other             string `json:"other"`
}

// don't use iota, avoid change log type value
const (
	LogTypeUnknown = 0
	LogTypeTopup   = 1
	LogTypeConsume = 2
	LogTypeManage  = 3
	LogTypeSystem  = 4
	LogTypeError   = 5
	LogTypeRefund  = 6
	LogTypeLogin   = 7
)

func ensureLogRequestId(log *Log) {
	if log != nil && log.RequestId == "" {
		log.RequestId = common.NewRequestId()
	}
}

func createLog(log *Log) error {
	ensureLogRequestId(log)
	return LOG_DB.Create(log).Error
}

func clickHouseLogOrder(prefix string) string {
	return prefix + "created_at desc, " + prefix + "request_id desc"
}

func assignDisplayLogIds(logs []*Log, startIdx int) {
	for i := range logs {
		logs[i].Id = startIdx + i + 1
	}
}

func formatUserLogs(logs []*Log, startIdx int) {
	for i := range logs {
		logs[i].ChannelName = ""
		var otherMap map[string]interface{}
		otherMap, _ = common.StrToMap(logs[i].Other)
		if otherMap != nil {
			// Remove admin-only debug fields.
			delete(otherMap, "admin_info")
			// Remove operation-audit details (operator/route info), admin-only.
			delete(otherMap, "audit_info")
			// delete(otherMap, "reject_reason")
			delete(otherMap, "stream_status")
		}
		logs[i].Other = common.MapToJsonStr(otherMap)
	}
	assignDisplayLogIds(logs, startIdx)
}

func GetLogByTokenId(tokenId int) (logs []*Log, err error) {
	order := "id desc"
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		order = clickHouseLogOrder("")
	}
	err = LOG_DB.Model(&Log{}).Where("token_id = ?", tokenId).Order(order).Limit(common.MaxRecentItems).Find(&logs).Error
	formatUserLogs(logs, 0)
	return logs, err
}

func RecordLog(userId int, logType int, content string) {
	if logType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(userId, false)
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	err := createLog(log)
	if err != nil {
		common.SysLog("failed to record log: " + err.Error())
	}
}

// RecordLogWithAdminInfo 记录操作日志，并将管理员相关信息存入 Other.admin_info，
func RecordLogWithAdminInfo(userId int, logType int, content string, adminInfo map[string]interface{}) {
	if logType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(userId, false)
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	if len(adminInfo) > 0 {
		other := map[string]interface{}{
			"admin_info": adminInfo,
		}
		log.Other = common.MapToJsonStr(other)
	}
	if err := createLog(log); err != nil {
		common.SysLog("failed to record log: " + err.Error())
	}
}

// buildOpField 构建语言无关的操作描述（写入 Other.op）。
// 前端依据 action(稳定操作标识) + params(结构化参数) 在渲染期用 i18n 本地化展示，
// 因此不在数据库中存储自然语言句子。
func buildOpField(action string, params map[string]interface{}) map[string]interface{} {
	op := map[string]interface{}{
		"action": action,
	}
	if len(params) > 0 {
		op["params"] = params
	}
	return op
}

// RecordLoginLog 记录用户登录成功的审计日志（type=LogTypeLogin）。
// username 由调用方传入（登录流程已持有用户对象），避免额外的数据库查询。
// content 为英文兜底文本（用于导出/经典前端）；action+params 供前端本地化渲染。
// extra 可携带 login_method、user_agent 等附加信息（普通用户可见）。
func RecordLoginLog(userId int, username string, content string, ip string, action string, params map[string]interface{}, extra map[string]interface{}) {
	other := map[string]interface{}{}
	for k, v := range extra {
		other[k] = v
	}
	other["op"] = buildOpField(action, params)
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeLogin,
		Content:   content,
		Ip:        ip,
		Other:     common.MapToJsonStr(other),
	}
	if err := createLog(log); err != nil {
		common.SysLog("failed to record login log: " + err.Error())
	}
}

// RecordOperationAuditLog 记录管理/高危操作审计日志（type=LogTypeManage）。
// logUserId 为日志归属者，管理审计日志应归属实际操作者；目标资源/用户放入
// action params。username 内部按 logUserId 查询。content 为英文兜底文本（导出/经典前端用）。
// action+params 写入 Other.op，供前端本地化渲染（普通用户可见，不含敏感信息）。
// adminInfo 存放操作者身份（写入 Other.admin_info，普通用户查询时剥离）；
// auditInfo 存放路由/方法/结果等中间件兜底信息（写入 Other.audit_info，普通用户查询时剥离）。
func RecordOperationAuditLog(logUserId int, content string, ip string, action string, params map[string]interface{}, adminInfo map[string]interface{}, auditInfo map[string]interface{}) {
	username, _ := GetUsernameById(logUserId, false)
	other := map[string]interface{}{
		"op": buildOpField(action, params),
	}
	if len(adminInfo) > 0 {
		other["admin_info"] = adminInfo
	}
	if len(auditInfo) > 0 {
		other["audit_info"] = auditInfo
	}
	log := &Log{
		UserId:    logUserId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeManage,
		Content:   content,
		Ip:        ip,
		Other:     common.MapToJsonStr(other),
	}
	if err := createLog(log); err != nil {
		common.SysLog("failed to record operation audit log: " + err.Error())
	}
}

func RecordTopupLog(userId int, content string, callerIp string, paymentMethod string, callbackPaymentMethod string) {
	username, _ := GetUsernameById(userId, false)
	adminInfo := map[string]interface{}{
		"server_ip":               common.GetIp(),
		"node_name":               common.NodeName,
		"caller_ip":               callerIp,
		"payment_method":          paymentMethod,
		"callback_payment_method": callbackPaymentMethod,
		"version":                 common.Version,
	}
	other := map[string]interface{}{
		"admin_info": adminInfo,
	}
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeTopup,
		Content:   content,
		Ip:        callerIp,
		Other:     common.MapToJsonStr(other),
	}
	err := createLog(log)
	if err != nil {
		common.SysLog("failed to record topup log: " + err.Error())
	}
}

func RecordErrorLog(c *gin.Context, userId int, channelId int, modelName string, tokenName string, content string, tokenId int, useTimeSeconds int,
	isStream bool, group string, other map[string]interface{}) {
	logger.LogInfo(c, fmt.Sprintf("record error log: userId=%d, channelId=%d, modelName=%s, tokenName=%s, content=%s", userId, channelId, modelName, tokenName, common.LocalLogPreview(content)))
	username := c.GetString("username")
	requestId := c.GetString(common.RequestIdKey)
	upstreamRequestId := c.GetString(common.UpstreamRequestIdKey)
	otherStr := common.MapToJsonStr(other)
	// 判断是否需要记录 IP
	needRecordIp := false
	if settingMap, err := GetUserSetting(userId, false); err == nil {
		if settingMap.RecordIpLog {
			needRecordIp = true
		}
	}
	log := &Log{
		UserId:           userId,
		Username:         username,
		CreatedAt:        common.GetTimestamp(),
		Type:             LogTypeError,
		Content:          content,
		PromptTokens:     0,
		CompletionTokens: 0,
		TokenName:        tokenName,
		ModelName:        modelName,
		Quota:            0,
		ChannelId:        channelId,
		TokenId:          tokenId,
		UseTime:          useTimeSeconds,
		IsStream:         isStream,
		Group:            group,
		Ip: func() string {
			if needRecordIp {
				return c.ClientIP()
			}
			return ""
		}(),
		RequestId:         requestId,
		UpstreamRequestId: upstreamRequestId,
		Other:             otherStr,
	}
	err := createLog(log)
	if err != nil {
		logger.LogError(c, "failed to record log: "+err.Error())
	}
}

type RecordConsumeLogParams struct {
	ChannelId        int                    `json:"channel_id"`
	PromptTokens     int                    `json:"prompt_tokens"`
	CompletionTokens int                    `json:"completion_tokens"`
	ModelName        string                 `json:"model_name"`
	TokenName        string                 `json:"token_name"`
	Quota            int                    `json:"quota"`
	Content          string                 `json:"content"`
	TokenId          int                    `json:"token_id"`
	UseTimeSeconds   int                    `json:"use_time_seconds"`
	IsStream         bool                   `json:"is_stream"`
	Group            string                 `json:"group"`
	Other            map[string]interface{} `json:"other"`
}

func RecordConsumeLog(c *gin.Context, userId int, params RecordConsumeLogParams) {
	if !common.LogConsumeEnabled {
		return
	}
	logger.LogInfo(c, fmt.Sprintf("record consume log: userId=%d, params=%s", userId, common.GetJsonString(params)))
	username := c.GetString("username")
	requestId := c.GetString(common.RequestIdKey)
	upstreamRequestId := c.GetString(common.UpstreamRequestIdKey)
	createdAt := common.GetTimestamp()
	otherStr := common.MapToJsonStr(params.Other)
	// 判断是否需要记录 IP
	needRecordIp := false
	if settingMap, err := GetUserSetting(userId, false); err == nil {
		if settingMap.RecordIpLog {
			needRecordIp = true
		}
	}
	log := &Log{
		UserId:           userId,
		Username:         username,
		CreatedAt:        createdAt,
		Type:             LogTypeConsume,
		Content:          params.Content,
		PromptTokens:     params.PromptTokens,
		CompletionTokens: params.CompletionTokens,
		TokenName:        params.TokenName,
		ModelName:        params.ModelName,
		Quota:            params.Quota,
		ChannelId:        params.ChannelId,
		TokenId:          params.TokenId,
		UseTime:          params.UseTimeSeconds,
		IsStream:         params.IsStream,
		Group:            params.Group,
		Ip: func() string {
			if needRecordIp {
				return c.ClientIP()
			}
			return ""
		}(),
		RequestId:         requestId,
		UpstreamRequestId: upstreamRequestId,
		Other:             otherStr,
	}
	err := createLog(log)
	if err != nil {
		logger.LogError(c, "failed to record log: "+err.Error())
	}
	if common.DataExportEnabled {
		LogQuotaData(QuotaDataLogParams{
			UserID:    userId,
			Username:  username,
			ModelName: params.ModelName,
			Quota:     params.Quota,
			CreatedAt: createdAt,
			TokenUsed: params.PromptTokens + params.CompletionTokens,
			UseGroup:  params.Group,
			TokenID:   params.TokenId,
			ChannelID: params.ChannelId,
			NodeName:  common.NodeName,
		})
	}
}

type RecordTaskBillingLogParams struct {
	UserId    int
	LogType   int
	Content   string
	ChannelId int
	ModelName string
	Quota     int
	TokenId   int
	Group     string
	Other     map[string]interface{}
	NodeName  string // 任务发起节点；为空时回退当前节点
}

func RecordTaskBillingLog(params RecordTaskBillingLogParams) {
	if params.LogType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(params.UserId, false)
	tokenName := ""
	if params.TokenId > 0 {
		if token, err := GetTokenById(params.TokenId); err == nil {
			tokenName = token.Name
		}
	}
	createdAt := common.GetTimestamp()
	log := &Log{
		UserId:    params.UserId,
		Username:  username,
		CreatedAt: createdAt,
		Type:      params.LogType,
		Content:   params.Content,
		TokenName: tokenName,
		ModelName: params.ModelName,
		Quota:     params.Quota,
		ChannelId: params.ChannelId,
		TokenId:   params.TokenId,
		Group:     params.Group,
		Other:     common.MapToJsonStr(params.Other),
	}
	err := createLog(log)
	if err != nil {
		common.SysLog("failed to record task billing log: " + err.Error())
	}
	if params.LogType == LogTypeConsume && common.DataExportEnabled {
		nodeName := params.NodeName
		if nodeName == "" {
			nodeName = common.NodeName
		}
		LogQuotaData(QuotaDataLogParams{
			UserID:    params.UserId,
			Username:  username,
			ModelName: params.ModelName,
			Quota:     params.Quota,
			CreatedAt: createdAt,
			UseGroup:  params.Group,
			TokenID:   params.TokenId,
			ChannelID: params.ChannelId,
			NodeName:  nodeName,
		})
	}
}

func GetAllLogs(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int, group string, requestId string, upstreamRequestId string) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB
	} else {
		tx = LOG_DB.Where("logs.type = ?", logType)
	}

	if tx, err = applyExplicitLogTextFilter(tx, "logs.model_name", modelName); err != nil {
		return nil, 0, err
	}
	if tx, err = applyLogUserKeywordFilter(tx, username, "logs.username"); err != nil {
		return nil, 0, err
	}
	if tokenName != "" {
		tx = tx.Where("logs.token_name = ?", tokenName)
	}
	if requestId != "" {
		tx = tx.Where("logs.request_id = ?", requestId)
	}
	if upstreamRequestId != "" {
		tx = tx.Where("logs.upstream_request_id = ?", upstreamRequestId)
	}
	if startTimestamp != 0 {
		tx = tx.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("logs.created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("logs.channel_id = ?", channel)
	}
	if group != "" {
		tx = tx.Where("logs."+logGroupCol+" = ?", group)
	}
	err = tx.Model(&Log{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	order := "logs.created_at desc, logs.id desc"
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		order = clickHouseLogOrder("logs.")
	}
	err = tx.Order(order).Limit(num).Offset(startIdx).Find(&logs).Error
	if err != nil {
		return nil, 0, err
	}
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		assignDisplayLogIds(logs, startIdx)
	}

	channelIds := types.NewSet[int]()
	for _, log := range logs {
		if log.ChannelId != 0 {
			channelIds.Add(log.ChannelId)
		}
	}

	if channelIds.Len() > 0 {
		var channels []struct {
			Id   int    `gorm:"column:id"`
			Name string `gorm:"column:name"`
		}
		if common.MemoryCacheEnabled {
			// Cache get channel
			for _, channelId := range channelIds.Items() {
				if cacheChannel, err := CacheGetChannel(channelId); err == nil {
					channels = append(channels, struct {
						Id   int    `gorm:"column:id"`
						Name string `gorm:"column:name"`
					}{
						Id:   channelId,
						Name: cacheChannel.Name,
					})
				}
			}
		} else {
			// Bulk query channels from DB
			if err = DB.Table("channels").Select("id, name").Where("id IN ?", channelIds.Items()).Find(&channels).Error; err != nil {
				return logs, total, err
			}
		}
		channelMap := make(map[int]string, len(channels))
		for _, channel := range channels {
			channelMap[channel.Id] = channel.Name
		}
		for i := range logs {
			logs[i].ChannelName = channelMap[logs[i].ChannelId]
		}
	}

	userIds := types.NewSet[int]()
	for _, log := range logs {
		if log.UserId != 0 {
			userIds.Add(log.UserId)
		}
	}
	if userIds.Len() > 0 {
		var users []struct {
			Id          int    `gorm:"column:id"`
			DisplayName string `gorm:"column:display_name"`
			AvatarUrl   string `gorm:"column:avatar_url"`
			OpenId      string `gorm:"column:open_id"`
		}
		if err = DB.Table("users").Select("id, display_name, avatar_url, open_id").Where("id IN ?", userIds.Items()).Find(&users).Error; err != nil {
			return logs, total, err
		}
		userMap := make(map[int]struct {
			DisplayName string
			AvatarUrl   string
			OpenId      string
		}, len(users))
		for _, u := range users {
			userMap[u.Id] = struct {
				DisplayName string
				AvatarUrl   string
				OpenId      string
			}{u.DisplayName, u.AvatarUrl, u.OpenId}
		}
		for i := range logs {
			if info, ok := userMap[logs[i].UserId]; ok {
				logs[i].DisplayName = info.DisplayName
				logs[i].AvatarUrl = info.AvatarUrl
				logs[i].OpenId = info.OpenId
			}
		}
	}

	return logs, total, err
}

const logSearchCountLimit = 10000

func GetUserLogs(userId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int, group string, requestId string, upstreamRequestId string) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB.Where("logs.user_id = ?", userId)
	} else {
		tx = LOG_DB.Where("logs.user_id = ? and logs.type = ?", userId, logType)
	}

	if tx, err = applyExplicitLogTextFilter(tx, "logs.model_name", modelName); err != nil {
		return nil, 0, err
	}
	if tokenName != "" {
		tx = tx.Where("logs.token_name = ?", tokenName)
	}
	if requestId != "" {
		tx = tx.Where("logs.request_id = ?", requestId)
	}
	if upstreamRequestId != "" {
		tx = tx.Where("logs.upstream_request_id = ?", upstreamRequestId)
	}
	if startTimestamp != 0 {
		tx = tx.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("logs.created_at <= ?", endTimestamp)
	}
	if group != "" {
		tx = tx.Where("logs."+logGroupCol+" = ?", group)
	}
	err = tx.Model(&Log{}).Limit(logSearchCountLimit).Count(&total).Error
	if err != nil {
		common.SysError("failed to count user logs: " + err.Error())
		return nil, 0, errors.New("查询日志失败")
	}
	order := "logs.id desc"
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		order = clickHouseLogOrder("logs.")
	}
	err = tx.Order(order).Limit(num).Offset(startIdx).Find(&logs).Error
	if err != nil {
		common.SysError("failed to search user logs: " + err.Error())
		return nil, 0, errors.New("查询日志失败")
	}

	formatUserLogs(logs, startIdx)
	return logs, total, err
}

type Stat struct {
	Quota int `json:"quota"`
	Rpm   int `json:"rpm"`
	Tpm   int `json:"tpm"`
}

func SumUsedQuota(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int, group string) (stat Stat, err error) {
	tx := LOG_DB.Table("logs").Select("COALESCE(sum(quota), 0) quota")

	// 为rpm和tpm创建单独的查询
	rpmTpmQuery := LOG_DB.Table("logs").Select("count(*) rpm, COALESCE(sum(prompt_tokens), 0) + COALESCE(sum(completion_tokens), 0) tpm")

	if tx, err = applyLogUserKeywordFilter(tx, username, "username"); err != nil {
		return stat, err
	}
	if rpmTpmQuery, err = applyLogUserKeywordFilter(rpmTpmQuery, username, "username"); err != nil {
		return stat, err
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
		rpmTpmQuery = rpmTpmQuery.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if tx, err = applyExplicitLogTextFilter(tx, "model_name", modelName); err != nil {
		return stat, err
	}
	if rpmTpmQuery, err = applyExplicitLogTextFilter(rpmTpmQuery, "model_name", modelName); err != nil {
		return stat, err
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
		rpmTpmQuery = rpmTpmQuery.Where("channel_id = ?", channel)
	}
	if group != "" {
		tx = tx.Where(logGroupCol+" = ?", group)
		rpmTpmQuery = rpmTpmQuery.Where(logGroupCol+" = ?", group)
	}

	tx = tx.Where("type = ?", LogTypeConsume)
	rpmTpmQuery = rpmTpmQuery.Where("type = ?", LogTypeConsume)

	// 只统计最近60秒的rpm和tpm
	rpmTpmQuery = rpmTpmQuery.Where("created_at >= ?", time.Now().Add(-60*time.Second).Unix())

	// 执行查询
	if err := tx.Scan(&stat).Error; err != nil {
		common.SysError("failed to query log stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}
	if err := rpmTpmQuery.Scan(&stat).Error; err != nil {
		common.SysError("failed to query rpm/tpm stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}

	return stat, nil
}

func SumUsedToken(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string) (token int) {
	tx := LOG_DB.Table("logs").Select("COALESCE(sum(prompt_tokens), 0) + COALESCE(sum(completion_tokens), 0)")
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&token)
	return token
}

func CountOldLog(ctx context.Context, targetTimestamp int64) (int64, error) {
	var total int64
	if err := LOG_DB.WithContext(ctx).Model(&Log{}).Where("created_at < ?", targetTimestamp).Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func DeleteOldLogBatch(ctx context.Context, targetTimestamp int64, limit int) (int64, error) {
	if limit <= 0 {
		limit = 100
	}
	if nil != ctx.Err() {
		return 0, ctx.Err()
	}

	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		// ClickHouse DELETE is a heavy mutation that rewrites data parts, so
		// per-batch mutations would be pathologically slow. Remove all matching
		// rows in a single synchronous mutation regardless of limit; the reported
		// count lets the caller's progress loop complete in one pass.
		total, err := CountOldLog(ctx, targetTimestamp)
		if err != nil {
			return 0, err
		}
		if total == 0 {
			return 0, nil
		}
		if err := LOG_DB.WithContext(ctx).Exec(
			"ALTER TABLE logs DELETE WHERE created_at < ? SETTINGS mutations_sync = 1",
			targetTimestamp,
		).Error; err != nil {
			return 0, err
		}
		return total, nil
	}

	result := LOG_DB.WithContext(ctx).Where("created_at < ?", targetTimestamp).Limit(limit).Delete(&Log{})
	if nil != result.Error {
		return 0, result.Error
	}
	return result.RowsAffected, nil
}

func DeleteOldLog(ctx context.Context, targetTimestamp int64, limit int) (int64, error) {
	if limit <= 0 {
		limit = 100
	}

	var total int64 = 0

	for {
		if nil != ctx.Err() {
			return total, ctx.Err()
		}

		rowsAffected, err := DeleteOldLogBatch(ctx, targetTimestamp, limit)
		if nil != err {
			return total, err
		}

		total += rowsAffected

		if rowsAffected < int64(limit) {
			break
		}
	}

	return total, nil
}

// UserStatRow holds per-user aggregated log data, used by batch department queries.
type UserStatRow struct {
	UserID      int   `gorm:"column:user_id"`
	TotalTokens int64 `gorm:"column:total_tokens"`
	TotalQuota  int64 `gorm:"column:total_quota"`
	TotalReqs   int64 `gorm:"column:total_reqs"`
}

// GetUserStatsBatch returns per-user aggregated stats for all given user IDs in one query.
func GetUserStatsBatch(userIds []int, startTimestamp, endTimestamp int64) ([]UserStatRow, error) {
	if len(userIds) == 0 {
		return nil, nil
	}
	var rows []UserStatRow
	tx := DB.Table("quota_data").
		Select(`user_id,
			COALESCE(SUM(token_used), 0) as total_tokens,
			COALESCE(SUM(quota), 0) as total_quota,
			COALESCE(SUM(count), 0) as total_reqs`).
		Where("user_id IN ?", userIds)

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}

	if err := tx.Group("user_id").Scan(&rows).Error; err != nil {
		return nil, errors.New("查询用户统计数据失败")
	}
	return rows, nil
}

// ModelStatRow holds per-model aggregated stats.
type ModelStatRow struct {
	ModelName   string `json:"model_name" gorm:"column:model_name"`
	TotalTokens int64  `json:"total_tokens" gorm:"column:total_tokens"`
	TotalQuota  int64  `json:"total_quota" gorm:"column:total_quota"`
	TotalReqs   int64  `json:"total_requests" gorm:"column:total_reqs"`
}

// UserModelStatRow holds per-user per-model aggregated stats.
type UserModelStatRow struct {
	UserID      int    `gorm:"column:user_id"`
	ModelName   string `gorm:"column:model_name"`
	TotalQuota  int64  `gorm:"column:total_quota"`
	TotalTokens int64  `gorm:"column:total_tokens"`
	TotalReqs   int64  `gorm:"column:total_reqs"`
}

// GetUserModelStatsBatch returns per-user per-model stats for all given user IDs.
func GetUserModelStatsBatch(userIds []int, startTimestamp, endTimestamp int64) ([]UserModelStatRow, error) {
	if len(userIds) == 0 {
		return nil, nil
	}
	var rows []UserModelStatRow
	tx := DB.Table("quota_data").
		Select(`user_id,
			model_name,
			COALESCE(SUM(quota), 0) as total_quota,
			COALESCE(SUM(token_used), 0) as total_tokens,
			COALESCE(SUM(count), 0) as total_reqs`).
		Where("user_id IN ?", userIds).
		Where("model_name != ''")

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}

	if err := tx.Group("user_id, model_name").Order("total_quota DESC").Scan(&rows).Error; err != nil {
		return nil, errors.New("查询用户模型统计数据失败")
	}
	return rows, nil
}

// GetModelStats returns per-model aggregated stats for the given user IDs, ordered by quota desc, limited to top N.
func GetModelStats(userIds []int, startTimestamp, endTimestamp int64, limit int) ([]ModelStatRow, error) {
	if len(userIds) == 0 {
		return nil, nil
	}
	var rows []ModelStatRow
	tx := DB.Table("quota_data").
		Select(`model_name,
			COALESCE(SUM(token_used), 0) as total_tokens,
			COALESCE(SUM(quota), 0) as total_quota,
			COALESCE(SUM(count), 0) as total_reqs`).
		Where("user_id IN ?", userIds).
		Where("model_name != ''")

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}

	if err := tx.Group("model_name").Order("total_quota DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, errors.New("查询模型统计数据失败")
	}
	return rows, nil
}

// DailyStatRow holds per-day aggregated stats.
type DailyStatRow struct {
	Date        string `json:"date" gorm:"column:date"`
	TotalTokens int64  `json:"total_tokens" gorm:"column:total_tokens"`
	TotalQuota  int64  `json:"total_quota" gorm:"column:total_quota"`
	TotalReqs   int64  `json:"total_requests" gorm:"column:total_reqs"`
}

// GetDailyStats returns per-day aggregated stats for the given user IDs.
func GetDailyStats(userIds []int, startTimestamp, endTimestamp int64) ([]DailyStatRow, error) {
	if len(userIds) == 0 {
		return nil, nil
	}

	dateExpr := "DATE(FROM_UNIXTIME(created_at))"
	if common.UsingMainDatabase(common.DatabaseTypeSQLite) {
		dateExpr = "DATE(created_at, 'unixepoch')"
	} else if common.UsingMainDatabase(common.DatabaseTypePostgreSQL) {
		dateExpr = "TO_CHAR(TO_TIMESTAMP(created_at), 'YYYY-MM-DD')"
	}

	var rows []DailyStatRow
	tx := DB.Table("quota_data").
		Select(dateExpr+` as date,
			COALESCE(SUM(token_used), 0) as total_tokens,
			COALESCE(SUM(quota), 0) as total_quota,
			COALESCE(SUM(count), 0) as total_reqs`).
		Where("user_id IN ?", userIds)

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}

	if err := tx.Group("date").Order("date ASC").Scan(&rows).Error; err != nil {
		return nil, errors.New("查询每日统计数据失败")
	}
	return rows, nil
}

// ModelDailyStatRow holds per-model per-day aggregated token stats.
type ModelDailyStatRow struct {
	Date        string `json:"date" gorm:"column:date"`
	ModelName   string `json:"model_name" gorm:"column:model_name"`
	TotalTokens int64  `json:"total_tokens" gorm:"column:total_tokens"`
}

// GetModelDailyStats returns per-model per-day token stats for the given user IDs, limited to the top N models.
func GetModelDailyStats(userIds []int, startTimestamp, endTimestamp int64, topN int) ([]ModelDailyStatRow, error) {
	if len(userIds) == 0 {
		return nil, nil
	}

	dateExpr := "DATE(FROM_UNIXTIME(created_at))"
	if common.UsingMainDatabase(common.DatabaseTypeSQLite) {
		dateExpr = "DATE(created_at, 'unixepoch')"
	} else if common.UsingMainDatabase(common.DatabaseTypePostgreSQL) {
		dateExpr = "TO_CHAR(TO_TIMESTAMP(created_at), 'YYYY-MM-DD')"
	}

	topModels, err := GetModelStats(userIds, startTimestamp, endTimestamp, topN)
	if err != nil {
		return nil, err
	}
	if len(topModels) == 0 {
		return nil, nil
	}
	modelNames := make([]string, len(topModels))
	for i, m := range topModels {
		modelNames[i] = m.ModelName
	}

	var rows []ModelDailyStatRow
	tx := DB.Table("quota_data").
		Select(dateExpr+` as date, model_name,
			COALESCE(SUM(token_used), 0) as total_tokens`).
		Where("user_id IN ?", userIds).
		Where("model_name IN ?", modelNames)

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}

	if err := tx.Group("date, model_name").Order("date ASC").Scan(&rows).Error; err != nil {
		return nil, errors.New("查询模型每日统计数据失败")
	}
	return rows, nil
}

// DepartmentStat holds aggregated statistics for a department.
type DepartmentStat struct {
	TotalTokens       int64   `json:"total_tokens"`
	TotalQuota        int64   `json:"total_quota"`
	TotalAmountCNY    float64 `json:"total_amount_cny"`
	TotalRequests     int64   `json:"total_requests"`
	TotalErrors       int64   `json:"total_errors"`
	TotalUseTime      int64   `json:"total_use_time"`
	AvgUseTime        float64 `json:"avg_use_time"`
	ErrorRate         float64 `json:"error_rate"`
	AvgPricePerMT     float64 `json:"avg_price_per_mt"`
	RegisteredUsers   int64   `json:"registered_users"`
	UnregisteredUsers int64   `json:"unregistered_users"`
}

// GetDepartmentStats aggregates statistics for a set of user IDs within a time range.
// Main metrics (tokens, quota, requests) come from quota_data; error count and use_time come from logs.
func GetDepartmentStats(userIds []int, startTimestamp, endTimestamp int64) (*DepartmentStat, error) {
	if len(userIds) == 0 {
		return &DepartmentStat{}, nil
	}

	type quotaResult struct {
		TotalTokens int64 `gorm:"column:total_tokens"`
		TotalQuota  int64 `gorm:"column:total_quota"`
		TotalReqs   int64 `gorm:"column:total_reqs"`
	}

	var qr quotaResult
	tx := DB.Table("quota_data").
		Select(`COALESCE(SUM(token_used), 0) as total_tokens,
			COALESCE(SUM(quota), 0) as total_quota,
			COALESCE(SUM(count), 0) as total_reqs`).
		Where("user_id IN ?", userIds)

	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if err := tx.Scan(&qr).Error; err != nil {
		return nil, errors.New("查询部门统计数据失败")
	}

	type errorResult struct {
		TotalErrors  int64 `gorm:"column:total_errors"`
		TotalUseTime int64 `gorm:"column:total_use_time"`
	}

	var er errorResult
	logTx := LOG_DB.Table("logs").
		Select(`COALESCE(SUM(CASE WHEN type = ? THEN 1 ELSE 0 END), 0) as total_errors,
			COALESCE(SUM(use_time), 0) as total_use_time`, LogTypeError).
		Where("type IN ?", []int{LogTypeConsume, LogTypeError}).
		Where("user_id IN ?", userIds)

	if startTimestamp != 0 {
		logTx = logTx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		logTx = logTx.Where("created_at <= ?", endTimestamp)
	}
	if err := logTx.Scan(&er).Error; err != nil {
		return nil, errors.New("查询部门错误统计数据失败")
	}

	stat := &DepartmentStat{
		TotalTokens:   qr.TotalTokens,
		TotalQuota:    qr.TotalQuota,
		TotalRequests: qr.TotalReqs,
		TotalErrors:   er.TotalErrors,
		TotalUseTime:  er.TotalUseTime,
	}

	if qr.TotalReqs > 0 {
		stat.ErrorRate = float64(er.TotalErrors) / float64(qr.TotalReqs) * 100
		stat.AvgUseTime = float64(er.TotalUseTime) / float64(qr.TotalReqs)
	}

	return stat, nil
}
