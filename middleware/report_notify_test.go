package middleware

import (
	"bytes"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const reportNotifyTestPath = "/internal/report-notify/user-reports"

func reportNotifyAuthTestRouter() *gin.Engine {
	router := gin.New()
	router.POST(reportNotifyTestPath, ReportNotifySignatureAuth(), func(c *gin.Context) {
		body, err := c.GetRawData()
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Data(http.StatusOK, "application/json", body)
	})
	return router
}

func signedReportNotifyTestRequest(secret string, timestamp int64, body []byte) *http.Request {
	timestampText := strconv.FormatInt(timestamp, 10)
	signature := reportNotifySignature([]byte(secret), http.MethodPost, reportNotifyTestPath, timestampText, body)
	request := httptest.NewRequest(http.MethodPost, reportNotifyTestPath, bytes.NewReader(body))
	request.Header.Set(reportNotifyTimestampHeader, timestampText)
	request.Header.Set(reportNotifySignatureHeader, hex.EncodeToString(signature))
	return request
}

func TestReportNotifySignatureAuthAcceptsValidSignatureAndPreservesBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "test-signing-secret-at-least-32-bytes"
	t.Setenv(reportNotifySigningSecretEnv, secret)
	body := []byte(`{"user_id":42,"start_timestamp":100,"end_timestamp":200}`)
	request := signedReportNotifyTestRequest(secret, time.Now().Unix(), body)
	response := httptest.NewRecorder()

	reportNotifyAuthTestRouter().ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
	assert.Equal(t, body, response.Body.Bytes())
}

func TestReportNotifySignatureAuthRejectsInvalidRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "test-signing-secret-at-least-32-bytes"
	t.Setenv(reportNotifySigningSecretEnv, secret)
	body := []byte(`{"user_id":42}`)
	now := time.Now().Unix()

	tests := []struct {
		name    string
		request func() *http.Request
	}{
		{
			name: "missing signature",
			request: func() *http.Request {
				request := httptest.NewRequest(http.MethodPost, reportNotifyTestPath, bytes.NewReader(body))
				request.Header.Set(reportNotifyTimestampHeader, strconv.FormatInt(now, 10))
				return request
			},
		},
		{name: "wrong secret", request: func() *http.Request {
			return signedReportNotifyTestRequest("wrong-signing-secret-at-least-32-bytes", now, body)
		}},
		{name: "expired timestamp", request: func() *http.Request {
			return signedReportNotifyTestRequest(secret, now-int64(reportNotifySignatureMaxAge/time.Second)-1, body)
		}},
		{name: "future timestamp", request: func() *http.Request {
			return signedReportNotifyTestRequest(secret, now+int64(reportNotifySignatureMaxAge/time.Second)+1, body)
		}},
		{name: "tampered body", request: func() *http.Request {
			request := signedReportNotifyTestRequest(secret, now, body)
			request.Body = http.NoBody
			return request
		}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			reportNotifyAuthTestRouter().ServeHTTP(response, test.request())
			assert.Equal(t, http.StatusUnauthorized, response.Code)
		})
	}
}

func TestReportNotifySignatureAuthRequiresServerConfiguration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(reportNotifySigningSecretEnv, "")
	request := signedReportNotifyTestRequest("any-signing-secret", time.Now().Unix(), []byte(`{}`))
	response := httptest.NewRecorder()

	reportNotifyAuthTestRouter().ServeHTTP(response, request)

	assert.Equal(t, http.StatusServiceUnavailable, response.Code)
}

func TestReportNotifySignatureAuthRejectsOversizedBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "test-signing-secret-at-least-32-bytes"
	t.Setenv(reportNotifySigningSecretEnv, secret)
	body := bytes.Repeat([]byte("x"), reportNotifyMaxBodySize+1)
	request := signedReportNotifyTestRequest(secret, time.Now().Unix(), body)
	response := httptest.NewRecorder()

	reportNotifyAuthTestRouter().ServeHTTP(response, request)

	require.Equal(t, http.StatusRequestEntityTooLarge, response.Code)
}
