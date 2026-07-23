package system_setting

import "github.com/QuantumNous/new-api/setting/config"

// OffHoursAuditSetting 非工作时间审计配置
type OffHoursAuditSetting struct {
	Enabled   bool `json:"enabled"`
	StartHour int  `json:"start_hour"`
	EndHour   int  `json:"end_hour"`
}

// DefaultImageStudioMaxHistory 是在线生图历史每用户默认保留条数。
const DefaultImageStudioMaxHistory = 10

// MaxImageStudioMaxHistory 是在线生图历史保留条数的上限，防止配置成不合理的巨大值
// 导致列表查询与裁剪开销失控。
const MaxImageStudioMaxHistory = 1000

// AuditSetting 安全审计配置
type AuditSetting struct {
	OffHours    OffHoursAuditSetting `json:"off_hours"`
	ImageStudio bool                 `json:"image_studio"`
	// AutoSaveApiImageGeneration 控制是否把通过原生 API（非在线生图 UI）产生的
	// 图片自动记录进在线生图历史。开启后会额外下载并持久化生成的图片，增加存储开销。
	AutoSaveApiImageGeneration bool `json:"auto_save_api_image_generation"`
	// ImageStudioMaxHistory 是在线生图历史每用户保留的最大条数，超出后最旧的记录
	// 会被裁剪并从对象存储中删除。0 或非法值时回退到 DefaultImageStudioMaxHistory。
	ImageStudioMaxHistory int `json:"image_studio_max_history"`
}

var auditSetting = AuditSetting{
	OffHours: OffHoursAuditSetting{
		Enabled:   true,
		StartHour: 3,
		EndHour:   7,
	},
	ImageStudio:                true,
	AutoSaveApiImageGeneration: false,
	ImageStudioMaxHistory:      DefaultImageStudioMaxHistory,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("audit_setting", &auditSetting)
}

// GetAuditSetting 获取安全审计配置
func GetAuditSetting() *AuditSetting {
	return &auditSetting
}

// GetImageStudioMaxHistory 返回归一化后的在线生图历史保留条数：非法值回退到默认值，
// 并钳制在 [1, MaxImageStudioMaxHistory] 区间内。
func GetImageStudioMaxHistory() int {
	limit := auditSetting.ImageStudioMaxHistory
	if limit <= 0 {
		return DefaultImageStudioMaxHistory
	}
	if limit > MaxImageStudioMaxHistory {
		return MaxImageStudioMaxHistory
	}
	return limit
}
