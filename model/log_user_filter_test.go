package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetLogsByUserIdsFiltersExactUserAndInclusiveTimeRange(t *testing.T) {
	truncateTables(t)
	require.NoError(t, LOG_DB.Exec("DELETE FROM logs").Error)

	logs := []Log{
		{UserId: 101, Username: "xuhai", CreatedAt: 99, Content: "before range"},
		{UserId: 101, Username: "xuhai", CreatedAt: 100, Content: "range start"},
		{UserId: 102, Username: "xuhailong", CreatedAt: 150, Content: "different user"},
		{UserId: 101, Username: "xuhai", CreatedAt: 200, Content: "range end"},
		{UserId: 101, Username: "xuhai", CreatedAt: 201, Content: "after range"},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	got, total, err := GetLogsByUserIds(
		[]int{101},
		LogTypeUnknown,
		100,
		200,
		"",
		"",
		"",
		0,
		10,
		0,
		"",
		"",
		"",
	)

	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	require.Len(t, got, 2)
	assert.Equal(t, "range end", got[0].Content)
	assert.Equal(t, "range start", got[1].Content)
	assert.Equal(t, []int{101, 101}, []int{got[0].UserId, got[1].UserId})
}

func TestGetAllLogsFiltersChannelByIDAndCaseInsensitiveFuzzyName(t *testing.T) {
	truncateTables(t)
	if common.UsingMainDatabase(common.DatabaseTypeSQLite) {
		require.NoError(t, DB.Exec("PRAGMA case_sensitive_like = ON").Error)
		t.Cleanup(func() {
			assert.NoError(t, DB.Exec("PRAGMA case_sensitive_like = OFF").Error)
		})
	}

	require.NoError(t, DB.Create(&[]Channel{
		{Id: 101, Name: "OpenAI Primary"},
		{Id: 102, Name: "Claude Backup"},
	}).Error)
	require.NoError(t, LOG_DB.Create(&[]Log{
		{ChannelId: 101, CreatedAt: 100, Content: "primary channel"},
		{ChannelId: 102, CreatedAt: 200, Content: "backup channel"},
	}).Error)

	logsByID, totalByID, err := GetAllLogs(
		LogTypeUnknown,
		0,
		0,
		"",
		"",
		"",
		0,
		10,
		"101",
		"",
		"",
		"",
		"",
	)
	require.NoError(t, err)
	assert.Equal(t, int64(1), totalByID)
	require.Len(t, logsByID, 1)
	assert.Equal(t, 101, logsByID[0].ChannelId)

	logsByName, totalByName, err := GetAllLogs(
		LogTypeUnknown,
		0,
		0,
		"",
		"",
		"",
		0,
		10,
		"BACKUP",
		"",
		"",
		"",
		"",
	)
	require.NoError(t, err)
	assert.Equal(t, int64(1), totalByName)
	require.Len(t, logsByName, 1)
	assert.Equal(t, 102, logsByName[0].ChannelId)
}

func TestGetUserLogsIncludesUserIdentityDetails(t *testing.T) {
	truncateTables(t)

	user := User{
		Username:    "self-log-user",
		Password:    "unused-password-hash",
		DisplayName: "Self Log User",
		AvatarUrl:   "https://example.com/self-log-user.png",
		OpenId:      "ou_self_log_user",
		Gender:      2,
	}
	require.NoError(t, DB.Create(&user).Error)
	require.NoError(t, LOG_DB.Create(&Log{
		UserId:    user.Id,
		Username:  user.Username,
		CreatedAt: 100,
		Content:   "self log",
	}).Error)

	logs, total, err := GetUserLogs(
		user.Id,
		LogTypeUnknown,
		0,
		0,
		"",
		"",
		0,
		10,
		"",
		"",
		"",
		"",
	)

	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, logs, 1)
	assert.Equal(t, user.DisplayName, logs[0].DisplayName)
	assert.Equal(t, user.AvatarUrl, logs[0].AvatarUrl)
	assert.Equal(t, user.OpenId, logs[0].OpenId)
	assert.Equal(t, user.Gender, logs[0].Gender)
}
