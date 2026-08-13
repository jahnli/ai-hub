package service

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// withLDAPCompanySyncConfigs 在单个用例内替换 LDAP 公司同步配置，并在用例结束后还原，
// 避免包级 defaultLDAPSettings 在用例之间泄漏。
func withLDAPCompanySyncConfigs(t *testing.T, configs []system_setting.LDAPCompanySyncConfig) {
	t.Helper()
	settings := system_setting.GetLDAPSettings()
	original := settings.CompanySyncConfigs
	settings.CompanySyncConfigs = configs
	t.Cleanup(func() {
		settings.CompanySyncConfigs = original
	})
}

func TestResolveFeishuSyncConfigUsesCompanyCredentialsAndSuffix(t *testing.T) {
	withLDAPCompanySyncConfigs(t, []system_setting.LDAPCompanySyncConfig{{
		Company:           "acme",
		SyncPlatform:      system_setting.LDAPSyncPlatformFeishu,
		FeishuAppID:       "cli_acme",
		FeishuAppSecret:   "secret_acme",
		FeishuEmailSuffix: "@acme.com",
	}})

	cfg, ok := resolveFeishuSyncConfig(&model.User{Company: "acme"})

	require.True(t, ok, "完整配置的飞书公司应解析成功")
	assert.Equal(t, "cli_acme", cfg.AppID)
	assert.Equal(t, "secret_acme", cfg.AppSecret)
	assert.Equal(t, "@acme.com", cfg.EmailSuffix)
}

// 邮箱后缀是飞书反查 open_id 的唯一入口，缺失时必须视为未配置而不是带着空后缀去调接口。
func TestResolveFeishuSyncConfigRejectsMissingEmailSuffix(t *testing.T) {
	withLDAPCompanySyncConfigs(t, []system_setting.LDAPCompanySyncConfig{{
		Company:         "acme",
		SyncPlatform:    system_setting.LDAPSyncPlatformFeishu,
		FeishuAppID:     "cli_acme",
		FeishuAppSecret: "secret_acme",
	}})

	_, ok := resolveFeishuSyncConfig(&model.User{Company: "acme"})

	assert.False(t, ok, "缺少邮箱后缀时不应触发飞书同步")
}

func TestResolveFeishuSyncConfigRejectsNonFeishuPlatform(t *testing.T) {
	withLDAPCompanySyncConfigs(t, []system_setting.LDAPCompanySyncConfig{{
		Company:           "acme",
		SyncPlatform:      system_setting.LDAPSyncPlatformNone,
		FeishuAppID:       "cli_acme",
		FeishuAppSecret:   "secret_acme",
		FeishuEmailSuffix: "@acme.com",
	}})

	_, ok := resolveFeishuSyncConfig(&model.User{Company: "acme"})

	assert.False(t, ok, "同步平台为 none 的公司不应进入飞书链路")
}

// 全局 FEISHU_* 兜底已移除：公司未配置时不得回落到任何全局凭据。
func TestResolveFeishuSyncConfigRejectsUnknownCompany(t *testing.T) {
	withLDAPCompanySyncConfigs(t, []system_setting.LDAPCompanySyncConfig{{
		Company:           "acme",
		SyncPlatform:      system_setting.LDAPSyncPlatformFeishu,
		FeishuAppID:       "cli_acme",
		FeishuAppSecret:   "secret_acme",
		FeishuEmailSuffix: "@acme.com",
	}})

	_, unknownOk := resolveFeishuSyncConfig(&model.User{Company: "not-configured"})
	_, emptyOk := resolveFeishuSyncConfig(&model.User{Company: ""})

	assert.False(t, unknownOk, "未配置的公司不应回落到全局凭据")
	assert.False(t, emptyOk, "公司为空不应回落到全局凭据")
}
