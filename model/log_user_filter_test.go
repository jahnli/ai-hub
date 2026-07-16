package model

import (
	"testing"

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
