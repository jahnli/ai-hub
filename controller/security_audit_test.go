package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNotifyOffHoursViolationRejectsInvalidAuditData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name string
		body string
	}{
		{name: "missing user", body: `{"start_time":1,"end_time":2,"request_count":3}`},
		{name: "invalid time range", body: `{"user_id":1,"start_time":2,"end_time":1,"request_count":3}`},
		{name: "empty request count", body: `{"user_id":1,"start_time":1,"end_time":2,"request_count":0}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			context.Request = httptest.NewRequest(
				http.MethodPost,
				"/api/security_audit/off_hours/notify-violation",
				strings.NewReader(test.body),
			)

			NotifyOffHoursViolation(context)

			assert.Equal(t, http.StatusOK, recorder.Code)
			var response struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			}
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
			assert.False(t, response.Success)
			assert.Contains(t, response.Message, "valid time range")
		})
	}
}
