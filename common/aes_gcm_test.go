package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptAESGCMProducesDecryptableNoncePrefixedPayload(t *testing.T) {
	plaintext := []byte(`{"success":true,"data":[{"model_name":"test-model"}]}`)
	keyMaterial := "test-only-model-square-key-32-bytes"
	additionalData := []byte("new-api:model-square:v1")

	encrypted, err := EncryptAESGCM(plaintext, keyMaterial, additionalData)
	require.NoError(t, err)

	decrypted, err := DecryptAESGCM(encrypted, keyMaterial, additionalData)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestEncryptAESGCMRejectsEmptyKeyMaterial(t *testing.T) {
	_, err := EncryptAESGCM([]byte("sensitive"), "", nil)

	assert.ErrorIs(t, err, ErrAESKeyMaterialEmpty)
}

func TestEncryptAESGCMRejectsShortKeyMaterial(t *testing.T) {
	_, err := EncryptAESGCM([]byte("sensitive"), "short key", nil)

	assert.ErrorIs(t, err, ErrAESKeyMaterialTooShort)
}

func TestEncryptAESGCMUsesUniqueRandomNonce(t *testing.T) {
	keyMaterial := "test-only-model-square-key-32-bytes"
	first, err := EncryptAESGCM([]byte("same plaintext"), keyMaterial, nil)
	require.NoError(t, err)
	second, err := EncryptAESGCM([]byte("same plaintext"), keyMaterial, nil)
	require.NoError(t, err)

	assert.NotEqual(t, first, second)
}

func TestDecryptAESGCMRejectsDifferentAdditionalData(t *testing.T) {
	keyMaterial := "test-only-model-square-key-32-bytes"
	encrypted, err := EncryptAESGCM([]byte("sensitive"), keyMaterial, []byte("expected"))
	require.NoError(t, err)

	_, err = DecryptAESGCM(encrypted, keyMaterial, []byte("different"))

	assert.Error(t, err)
}
