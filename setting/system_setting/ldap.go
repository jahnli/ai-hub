package system_setting

import "github.com/QuantumNous/new-api/setting/config"

type LDAPSettings struct {
	Enabled              bool   `json:"enabled"`
	ServerURL            string `json:"server_url"`
	BindDN               string `json:"bind_dn"`
	BindPassword         string `json:"bind_password"`
	SearchBase           string `json:"search_base"`
	SearchFilter         string `json:"search_filter"`
	UsernameAttribute    string `json:"username_attribute"`
	EmailAttribute       string `json:"email_attribute"`
	DisplayNameAttribute string `json:"display_name_attribute"`
	StartTLS             bool   `json:"start_tls"`
	SkipTLSVerify        bool   `json:"skip_tls_verify"`
	LoginLabel           string `json:"login_label"`
	AutoSubscribePlanId  int    `json:"auto_subscribe_plan_id"`
}

var defaultLDAPSettings = LDAPSettings{
	SearchFilter:         "(uid={{username}})",
	UsernameAttribute:    "uid",
	EmailAttribute:       "mail",
	DisplayNameAttribute: "cn",
}

func init() {
	config.GlobalConfig.Register("ldap", &defaultLDAPSettings)
}

func GetLDAPSettings() *LDAPSettings {
	return &defaultLDAPSettings
}
