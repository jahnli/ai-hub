package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetDepartmentStatsCountsActiveUsersByRequestThreshold(t *testing.T) {
	truncateTables(t)

	quotaRows := []QuotaData{
		{UserID: 101, CreatedAt: 120, Count: 6, TokenUsed: 600_000, Quota: 60},
		{UserID: 101, CreatedAt: 140, Count: 5, TokenUsed: 500_000, Quota: 50},
		{UserID: 102, CreatedAt: 130, Count: 10, TokenUsed: 1_000_000, Quota: 100},
		{UserID: 103, CreatedAt: 99, Count: 50, TokenUsed: 5_000_000, Quota: 500},
		{UserID: 104, CreatedAt: 150, Count: 100, TokenUsed: 10_000_000, Quota: 1_000},
	}
	require.NoError(t, DB.Create(&quotaRows).Error)

	logs := []Log{
		{UserId: 101, CreatedAt: 150, Type: LogTypeConsume, UseTime: 4},
		{UserId: 102, CreatedAt: 160, Type: LogTypeError, UseTime: 2},
		{UserId: 103, CreatedAt: 99, Type: LogTypeError, UseTime: 100},
		{UserId: 104, CreatedAt: 170, Type: LogTypeError, UseTime: 100},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	stat, err := GetDepartmentStats([]int{101, 102, 103}, 100, 200, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(2_100_000), stat.TotalTokens)
	assert.Equal(t, int64(21), stat.TotalRequests)
	assert.Equal(t, int64(1), stat.ActiveUsers)
	assert.Equal(t, 10, stat.ActiveUserRequestThreshold)
	assert.Equal(t, int64(1), stat.TotalErrors)
	assert.InDelta(t, 6.0/21.0, stat.AvgUseTime, 0.000001)

	stat, err = GetDepartmentStats([]int{101, 102, 103}, 100, 200, 5)
	require.NoError(t, err)
	assert.Equal(t, int64(2), stat.ActiveUsers)
	assert.Equal(t, 5, stat.ActiveUserRequestThreshold)
}

func TestGetDepartmentStatsKeepsThresholdForEmptyDepartment(t *testing.T) {
	stat, err := GetDepartmentStats(nil, 0, 0, 7)
	require.NoError(t, err)
	assert.Equal(t, int64(0), stat.ActiveUsers)
	assert.Equal(t, 7, stat.ActiveUserRequestThreshold)
}
