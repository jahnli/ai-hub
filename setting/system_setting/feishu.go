package system_setting

import "github.com/QuantumNous/new-api/common"

// 飞书（Lark）开放平台凭据与同步参数。
// 这些值属于部署级敏感配置，从 .env 读取，不进入后台 UI / options 表。
var (
	FeishuAppID       = common.GetEnvOrDefaultString("FEISHU_APP_ID", "")
	FeishuAppSecret   = common.GetEnvOrDefaultString("FEISHU_APP_SECRET", "")
	FeishuEmailSuffix = common.GetEnvOrDefaultString("FEISHU_EMAIL_SUFFIX", "@semi-tech.com")
)

// FeishuEnabled 表示是否配置了飞书凭据，可用以决定是否触发同步。
func FeishuEnabled() bool {
	return FeishuAppID != "" && FeishuAppSecret != ""
}
