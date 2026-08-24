package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeFeishuRobotWebhookURL(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedValue string
		expectsError  bool
	}{
		{
			name:          "empty value disables notifications",
			input:         "   ",
			expectedValue: "",
		},
		{
			name:          "valid official webhook is normalized",
			input:         "  https://OPEN.FEISHU.CN/open-apis/bot/v2/hook/robot-token_123  ",
			expectedValue: "https://open.feishu.cn/open-apis/bot/v2/hook/robot-token_123",
		},
		{
			name:         "http scheme is rejected",
			input:        "http://open.feishu.cn/open-apis/bot/v2/hook/robot-token",
			expectsError: true,
		},
		{
			name:         "lookalike host is rejected",
			input:        "https://open.feishu.cn.attacker.example/open-apis/bot/v2/hook/robot-token",
			expectsError: true,
		},
		{
			name:         "missing webhook token is rejected",
			input:        "https://open.feishu.cn/open-apis/bot/v2/hook/",
			expectsError: true,
		},
		{
			name:         "query parameters are rejected",
			input:        "https://open.feishu.cn/open-apis/bot/v2/hook/robot-token?redirect=1",
			expectsError: true,
		},
		{
			name:         "escaped path is rejected",
			input:        "https://open.feishu.cn/open-apis/bot/v2/hook/robot%2Ftoken",
			expectsError: true,
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			normalizedValue, err := NormalizeFeishuRobotWebhookURL(testCase.input)
			if testCase.expectsError {
				require.Error(t, err)
				assert.Empty(t, normalizedValue)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedValue, normalizedValue)
		})
	}
}
