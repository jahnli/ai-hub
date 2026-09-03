package common

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

const AESKeyMaterialMinBytes = 32

var (
	ErrAESKeyMaterialEmpty    = errors.New("AES key material is empty")
	ErrAESKeyMaterialTooShort = errors.New("AES key material must contain at least 32 bytes")
)

// EncryptAESGCM encrypts plaintext with an AES-256 key derived from keyMaterial.
// The returned base64 payload contains the random nonce followed by ciphertext.
func EncryptAESGCM(plaintext []byte, keyMaterial string, additionalData []byte) (string, error) {
	if keyMaterial == "" {
		return "", ErrAESKeyMaterialEmpty
	}
	if len([]byte(keyMaterial)) < AESKeyMaterialMinBytes {
		return "", ErrAESKeyMaterialTooShort
	}

	gcm, err := newAESGCM(keyMaterial)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate AES-GCM nonce: %w", err)
	}

	sealed := gcm.Seal(nonce, nonce, plaintext, additionalData)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// DecryptAESGCM decrypts a base64 payload produced by EncryptAESGCM.
func DecryptAESGCM(payload string, keyMaterial string, additionalData []byte) ([]byte, error) {
	if keyMaterial == "" {
		return nil, ErrAESKeyMaterialEmpty
	}
	if len([]byte(keyMaterial)) < AESKeyMaterialMinBytes {
		return nil, ErrAESKeyMaterialTooShort
	}

	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, fmt.Errorf("decode AES-GCM payload: %w", err)
	}
	gcm, err := newAESGCM(keyMaterial)
	if err != nil {
		return nil, err
	}
	if len(decoded) <= gcm.NonceSize() {
		return nil, errors.New("AES-GCM payload is too short")
	}

	nonce := decoded[:gcm.NonceSize()]
	ciphertext := decoded[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, additionalData)
	if err != nil {
		return nil, fmt.Errorf("decrypt AES-GCM payload: %w", err)
	}
	return plaintext, nil
}

func newAESGCM(keyMaterial string) (cipher.AEAD, error) {
	key := sha256.Sum256([]byte(keyMaterial))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("create AES cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create AES-GCM cipher: %w", err)
	}
	return gcm, nil
}
