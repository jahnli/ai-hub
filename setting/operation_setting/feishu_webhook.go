package operation_setting

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	FeishuChannelStatusWebhookOptionKey = "monitor_setting.feishu_channel_status_webhook_url"
	feishuRobotWebhookHost              = "open.feishu.cn"
	feishuRobotWebhookPathPrefix        = "/open-apis/bot/v2/hook/"
)

// NormalizeFeishuRobotWebhookURL validates an official Feishu custom-bot URL.
// An empty value is valid and disables channel status notifications.
func NormalizeFeishuRobotWebhookURL(rawWebhookURL string) (string, error) {
	trimmedWebhookURL := strings.TrimSpace(rawWebhookURL)
	if trimmedWebhookURL == "" {
		return "", nil
	}

	parsedWebhookURL, err := url.Parse(trimmedWebhookURL)
	if err != nil {
		return "", fmt.Errorf("invalid Feishu robot webhook URL: %w", err)
	}
	if parsedWebhookURL.Scheme != "https" ||
		!strings.EqualFold(parsedWebhookURL.Hostname(), feishuRobotWebhookHost) ||
		parsedWebhookURL.Port() != "" {
		return "", fmt.Errorf("Feishu robot webhook must use https://%s", feishuRobotWebhookHost)
	}
	if parsedWebhookURL.User != nil || parsedWebhookURL.RawQuery != "" || parsedWebhookURL.Fragment != "" {
		return "", fmt.Errorf("Feishu robot webhook must not contain user info, query parameters, or fragments")
	}
	if parsedWebhookURL.RawPath != "" {
		return "", fmt.Errorf("Feishu robot webhook path must not contain escaped characters")
	}

	webhookToken := strings.TrimPrefix(parsedWebhookURL.Path, feishuRobotWebhookPathPrefix)
	if webhookToken == parsedWebhookURL.Path || webhookToken == "" || strings.Contains(webhookToken, "/") {
		return "", fmt.Errorf("Feishu robot webhook must include a valid webhook token")
	}
	for _, tokenCharacter := range webhookToken {
		isLetter := tokenCharacter >= 'a' && tokenCharacter <= 'z' || tokenCharacter >= 'A' && tokenCharacter <= 'Z'
		isNumber := tokenCharacter >= '0' && tokenCharacter <= '9'
		if !isLetter && !isNumber && tokenCharacter != '-' && tokenCharacter != '_' {
			return "", fmt.Errorf("Feishu robot webhook token contains invalid characters")
		}
	}

	return "https://" + feishuRobotWebhookHost + feishuRobotWebhookPathPrefix + webhookToken, nil
}
