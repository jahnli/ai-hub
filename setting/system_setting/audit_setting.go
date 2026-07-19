package system_setting

import "github.com/QuantumNous/new-api/setting/config"

// AuditSetting 安全审计配置
type AuditSetting struct {
	Enabled           bool `json:"enabled"`              // 是否启用安全审计
	OffHoursStartHour int  `json:"off_hours_start_hour"` // 非工作时间段开始小时(0-23,服务器本地时区)
	OffHoursEndHour   int  `json:"off_hours_end_hour"`   // 非工作时间段结束小时(0-23;小于开始小时表示跨午夜)
}

// 默认配置:审计时段凌晨 3-7 点
var auditSetting = AuditSetting{
	Enabled:           true,
	OffHoursStartHour: 3,
	OffHoursEndHour:   7,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("audit_setting", &auditSetting)
}

// GetAuditSetting 获取安全审计配置
func GetAuditSetting() *AuditSetting {
	return &auditSetting
}
