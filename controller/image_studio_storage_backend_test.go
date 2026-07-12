package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestImageStudioMinIOObjectNamePreservesAssetPath(t *testing.T) {
	storage := imageStudioMinIOStorage{}

	assert.Equal(t,
		"image/alice_admin/0123456789abcdef.png",
		storage.objectName("alice_admin/0123456789abcdef.png"),
	)
}

func TestNewImageStudioMinIOStorageUsesConfiguredBucket(t *testing.T) {
	t.Setenv("IMAGE_STUDIO_MINIO_ENDPOINT", "http://127.0.0.1:9000")
	t.Setenv("IMAGE_STUDIO_MINIO_ACCESS_KEY", "access-key")
	t.Setenv("IMAGE_STUDIO_MINIO_SECRET_KEY", "secret-key")
	t.Setenv("IMAGE_STUDIO_MINIO_BUCKET", "generated-images")

	storage, err := newImageStudioMinIOStorage()
	require.NoError(t, err)
	assert.Equal(t, "generated-images", storage.bucket)
}
