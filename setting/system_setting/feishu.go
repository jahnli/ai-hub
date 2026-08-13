package system_setting

import (
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// 飞书（Lark）开放平台凭据与同步参数。
// 这些值属于部署级敏感配置，从 .env 读取，不进入后台 UI / options 表。
// 使用惰性初始化，确保在 .env 加载完毕后才读取环境变量。
var (
	feishuAppID         = sync.OnceValue(func() string { return common.GetEnvOrDefaultString("FEISHU_APP_ID", "") })
	feishuAppSecret     = sync.OnceValue(func() string { return common.GetEnvOrDefaultString("FEISHU_APP_SECRET", "") })
	feishuSupportOpenID = sync.OnceValue(func() string { return common.GetEnvOrDefaultString("FEISHU_SUPPORT_OPEN_ID", "") })
)

func FeishuAppID() string         { return feishuAppID() }
func FeishuAppSecret() string     { return feishuAppSecret() }
func FeishuSupportOpenID() string { return feishuSupportOpenID() }
