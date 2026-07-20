package system_setting

import "github.com/QuantumNous/new-api/setting/config"

// OffHoursAuditSetting 非工作时间审计配置
type OffHoursAuditSetting struct {
	Enabled   bool `json:"enabled"`
	StartHour int  `json:"start_hour"`
	EndHour   int  `json:"end_hour"`
}

// AuditSetting 安全审计配置
type AuditSetting struct {
	OffHours OffHoursAuditSetting `json:"off_hours"`
}

var auditSetting = AuditSetting{
	OffHours: OffHoursAuditSetting{
		Enabled:   true,
		StartHour: 3,
		EndHour:   7,
	},
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("audit_setting", &auditSetting)
}

// GetAuditSetting 获取安全审计配置
func GetAuditSetting() *AuditSetting {
	return &auditSetting
}
