package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetPricingReturnsEncryptedTextPayload(t *testing.T) {
	const key = "test-only-model-square-key-32-bytes"
	t.Setenv(modelSquareAESKeyEnv, key)
	db := setupModelListControllerTestDB(t)
	require.NoError(t, db.Create(&model.Ability{
		Group:     "default",
		Model:     "zz-encrypted-pricing-model",
		ChannelId: 7001,
		Enabled:   true,
	}).Error)
	model.InvalidatePricingCache()

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/pricing", nil)

	GetPricing(context)

	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "text/plain; charset=utf-8", recorder.Header().Get("Content-Type"))
	assert.Equal(t, "no-store", recorder.Header().Get("Cache-Control"))
	assert.NotContains(t, recorder.Body.String(), "zz-encrypted-pricing-model")

	plaintext, err := common.DecryptAESGCM(recorder.Body.String(), key, []byte(modelSquareAESAAD))
	require.NoError(t, err)
	var response struct {
		Success bool            `json:"success"`
		Data    []model.Pricing `json:"data"`
	}
	require.NoError(t, common.Unmarshal(plaintext, &response))
	assert.True(t, response.Success)
	modelNames := make([]string, 0, len(response.Data))
	for _, item := range response.Data {
		modelNames = append(modelNames, item.ModelName)
	}
	assert.Contains(t, modelNames, "zz-encrypted-pricing-model")
}

func TestGetPricingRejectsMissingEncryptionKey(t *testing.T) {
	t.Setenv(modelSquareAESKeyEnv, "")
	db := setupModelListControllerTestDB(t)
	require.NoError(t, db.Create(&model.Ability{
		Group:     "default",
		Model:     "zz-unconfigured-encryption-model",
		ChannelId: 7002,
		Enabled:   true,
	}).Error)
	model.InvalidatePricingCache()

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/pricing", nil)

	GetPricing(context)

	assert.Equal(t, http.StatusInternalServerError, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "encryption is not configured")
}
