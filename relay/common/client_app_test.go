package common

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newClientAppTestContext(t *testing.T, headers map[string]string) *gin.Context {
	t.Helper()
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader("{}"))
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	return context
}

func TestDetectClientAppReturnsRawUserAgent(t *testing.T) {
	t.Parallel()

	userAgent := "claude-cli/2.1.154 (external, cli)"
	context := newClientAppTestContext(t, map[string]string{
		"User-Agent":      userAgent,
		"X-App":           "cli",
		"Anthropic-Beta": "claude-code-20250219",
		"X-Title":         "Cursor",
	})

	require.Equal(t, userAgent, DetectClientApp(context))
}

func TestDetectClientAppReturnsEmptyWhenUserAgentMissing(t *testing.T) {
	t.Parallel()

	context := newClientAppTestContext(t, map[string]string{
		"X-Title": "Roo Code",
	})

	require.Equal(t, "", DetectClientApp(context))
}

func TestDetectClientAppNilSafe(t *testing.T) {
	t.Parallel()
	require.Equal(t, "", DetectClientApp(nil))

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = nil
	require.Equal(t, "", DetectClientApp(context))
}
