package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigrateLegacyAuditSetting(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.Create([]Option{
		{Key: "audit_setting.enabled", Value: "false"},
		{Key: "audit_setting.off_hours_start_hour", Value: "4"},
		{Key: "audit_setting.off_hours_end_hour", Value: "9"},
	}).Error)

	require.NoError(t, migrateLegacyAuditSetting())

	var migratedOption Option
	require.NoError(t, DB.Where("key = ?", "audit_setting.off_hours").First(&migratedOption).Error)
	var migratedValue struct {
		Enabled   bool `json:"enabled"`
		StartHour int  `json:"start_hour"`
		EndHour   int  `json:"end_hour"`
	}
	require.NoError(t, common.UnmarshalJsonStr(migratedOption.Value, &migratedValue))
	assert.False(t, migratedValue.Enabled)
	assert.Equal(t, 4, migratedValue.StartHour)
	assert.Equal(t, 9, migratedValue.EndHour)

	var legacyCount int64
	require.NoError(t, DB.Model(&Option{}).
		Where("key IN ?", []string{
			"audit_setting.enabled",
			"audit_setting.off_hours_start_hour",
			"audit_setting.off_hours_end_hour",
		}).
		Count(&legacyCount).Error)
	assert.Zero(t, legacyCount)
}

func TestMigrateLegacyAuditSettingPreservesExistingObject(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.Create([]Option{
		{Key: "audit_setting.off_hours", Value: `{"enabled":true,"start_hour":2,"end_hour":8}`},
		{Key: "audit_setting.off_hours_start_hour", Value: "5"},
	}).Error)

	require.NoError(t, migrateLegacyAuditSetting())

	var migratedOption Option
	require.NoError(t, DB.Where("key = ?", "audit_setting.off_hours").First(&migratedOption).Error)
	assert.JSONEq(t, `{"enabled":true,"start_hour":2,"end_hour":8}`, migratedOption.Value)

	var legacyCount int64
	require.NoError(t, DB.Model(&Option{}).
		Where("key = ?", "audit_setting.off_hours_start_hour").
		Count(&legacyCount).Error)
	assert.Zero(t, legacyCount)
}
