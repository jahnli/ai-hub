package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSendFeishuRobotCardRequestSendsInteractivePayload(t *testing.T) {
	occurredAt := time.Date(2026, time.August, 24, 16, 30, 0, 0, time.UTC)
	disableCard := buildFeishuChannelDisableCard("测试渠道", 7, "上游返回 401", occurredAt)

	server := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		assert.Equal(t, http.MethodPost, request.Method)
		assert.Equal(t, "application/json", request.Header.Get("Content-Type"))

		var payload feishuRobotInteractivePayload
		require.NoError(t, common.DecodeJson(request.Body, &payload))
		assert.Equal(t, "interactive", payload.MessageType)

		header, headerIsObject := payload.Card["header"].(map[string]any)
		require.True(t, headerIsObject)
		assert.Equal(t, "red", header["template"])
		title, titleIsObject := header["title"].(map[string]any)
		require.True(t, titleIsObject)
		assert.Equal(t, "渠道已自动禁用", title["content"])

		responseWriter.Header().Set("Content-Type", "application/json")
		_, writeErr := responseWriter.Write([]byte(`{"code":0,"msg":"success"}`))
		require.NoError(t, writeErr)
	}))
	defer server.Close()

	err := sendFeishuRobotCardRequest(
		context.Background(),
		server.Client(),
		server.URL,
		disableCard,
	)

	require.NoError(t, err)
}

func TestSendFeishuRobotCardRequestRejectsHTTPFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		responseWriter.WriteHeader(http.StatusBadGateway)
		_, writeErr := responseWriter.Write([]byte(`{"code":0,"msg":"success"}`))
		require.NoError(t, writeErr)
	}))
	defer server.Close()

	err := sendFeishuRobotCardRequest(context.Background(), server.Client(), server.URL, map[string]any{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "HTTP status 502")
}

func TestSendFeishuRobotCardRequestRejectsBusinessFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		responseWriter.Header().Set("Content-Type", "application/json")
		_, writeErr := responseWriter.Write([]byte(`{"StatusCode":19024,"StatusMessage":"Key Words Not Found"}`))
		require.NoError(t, writeErr)
	}))
	defer server.Close()

	err := sendFeishuRobotCardRequest(context.Background(), server.Client(), server.URL, map[string]any{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "code=19024")
	assert.Contains(t, err.Error(), "Key Words Not Found")
}

func TestBuildFeishuChannelDisableCardUsesAlertPresentationAndProtectsReason(t *testing.T) {
	originalServerAddress := system_setting.ServerAddress
	system_setting.ServerAddress = "https://gateway.example.com/"
	t.Cleanup(func() {
		system_setting.ServerAddress = originalServerAddress
	})

	reason := "upstream rejected https://secret.example/path?api_key=secret " + strings.Repeat("x", 1100)
	occurredAt := time.Date(2026, time.August, 24, 16, 30, 0, 0, time.UTC)

	card := buildFeishuChannelDisableCard("测试*渠道", 7, reason, occurredAt)
	cardBytes, err := common.Marshal(card)
	require.NoError(t, err)
	serializedCard := string(cardBytes)

	assert.Contains(t, serializedCard, `"template":"red"`)
	assert.Contains(t, serializedCard, "渠道已自动禁用")
	assert.Contains(t, serializedCard, "路由保护已触发")
	assert.Contains(t, serializedCard, `测试\\*渠道`)
	assert.Contains(t, serializedCard, "#7")
	assert.Contains(t, serializedCard, "2026-08-24 16:30:00 UTC")
	assert.Contains(t, serializedCard, "前往渠道管理")
	assert.Contains(t, serializedCard, `https://gateway.example.com/channels?filter=%E6%B5%8B%E8%AF%95%2A%E6%B8%A0%E9%81%93`)
	assert.NotContains(t, serializedCard, "secret.example")
	assert.LessOrEqual(t, len([]rune(formatFeishuChannelDisableReason(reason))), 1003)
}

func TestBuildFeishuChannelDisableCardOmitsManagementButtonWithoutServerAddress(t *testing.T) {
	originalServerAddress := system_setting.ServerAddress
	system_setting.ServerAddress = ""
	t.Cleanup(func() {
		system_setting.ServerAddress = originalServerAddress
	})

	card := buildFeishuChannelDisableCard("测试渠道", 7, "上游返回 401", time.Now())
	cardBytes, err := common.Marshal(card)
	require.NoError(t, err)

	assert.NotContains(t, string(cardBytes), "前往渠道管理")
}

func TestBuildFeishuChannelEnableCardUsesRecoveryPresentation(t *testing.T) {
	occurredAt := time.Date(2026, time.August, 24, 17, 0, 0, 0, time.UTC)

	card := buildFeishuChannelEnableCard("恢复渠道", 9, occurredAt)
	cardBytes, err := common.Marshal(card)
	require.NoError(t, err)
	serializedCard := string(cardBytes)

	assert.Contains(t, serializedCard, `"template":"green"`)
	assert.Contains(t, serializedCard, "渠道已恢复")
	assert.Contains(t, serializedCard, "渠道健康检查通过")
	assert.Contains(t, serializedCard, "恢复渠道")
	assert.Contains(t, serializedCard, "#9")
	assert.Contains(t, serializedCard, "2026-08-24 17:00:00 UTC")
	assert.NotContains(t, serializedCard, "禁用原因")
}
