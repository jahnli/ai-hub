package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetActiveUserThreshold(t *testing.T) {
	t.Setenv("DATA_OVERVIEW_ACTIVE_USER_THRESHOLD_FORMULA", "")
	const secondsPerDay = int64(24 * 60 * 60)
	const startTimestamp = int64(1_700_000_000)

	testCases := []struct {
		name             string
		queryDays        int64
		expectedRequests int64
		expectedTokens   int64
	}{
		{name: "one day", queryDays: 1, expectedRequests: 10, expectedTokens: 1_000_000},
		{name: "two days", queryDays: 2, expectedRequests: 19, expectedTokens: 1_802_501},
		{name: "seven days", queryDays: 7, expectedRequests: 53, expectedTokens: 5_227_973},
		{name: "thirty one days", queryDays: 31, expectedRequests: 186, expectedTokens: 18_520_702},
		{name: "ninety two days", queryDays: 92, expectedRequests: 467, expectedTokens: 46_689_547},
		{name: "three hundred sixty five days", queryDays: 365, expectedRequests: 1_507, expectedTokens: 150_642_993},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			endTimestamp := startTimestamp + (testCase.queryDays-1)*secondsPerDay
			threshold := getActiveUserThreshold(startTimestamp, endTimestamp)

			require.Positive(t, threshold.RequestCount)
			assert.Equal(t, testCase.expectedRequests, threshold.RequestCount)
			assert.Equal(t, testCase.expectedTokens, threshold.TokenCount)
		})
	}
}

func TestGetActiveUserThresholdUsesConfiguredFormula(t *testing.T) {
	t.Setenv("DATA_OVERVIEW_ACTIVE_USER_THRESHOLD_FORMULA", `[5,500000,1]`)
	const startTimestamp = int64(1_700_000_000)
	const secondsPerDay = int64(24 * 60 * 60)

	threshold := getActiveUserThreshold(startTimestamp, startTimestamp+6*secondsPerDay)

	assert.Equal(t, int64(35), threshold.RequestCount)
	assert.Equal(t, int64(3_500_000), threshold.TokenCount)
}

func TestGetActiveUserThresholdRejectsInvalidFormula(t *testing.T) {
	t.Setenv("DATA_OVERVIEW_ACTIVE_USER_THRESHOLD_FORMULA", `[10,1000000,0]`)
	const timestamp = int64(1_700_000_000)

	threshold := getActiveUserThreshold(timestamp, timestamp)

	assert.Equal(t, int64(10), threshold.RequestCount)
	assert.Equal(t, int64(1_000_000), threshold.TokenCount)
}
