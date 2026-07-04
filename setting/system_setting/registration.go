package system_setting

import "github.com/QuantumNous/new-api/setting/config"

// RegistrationSettings 维护用户注册后的自动化配置。
// 字段通过 config.GlobalConfig 以 "registration.<field>" 的键形式持久化到数据库。
type RegistrationSettings struct {
	AutoSubscribePlanId int `json:"auto_subscribe_plan_id"`
}

var defaultRegistrationSettings = RegistrationSettings{}

func init() {
	config.GlobalConfig.Register("registration", &defaultRegistrationSettings)
}

func GetRegistrationSettings() *RegistrationSettings {
	return &defaultRegistrationSettings
}
