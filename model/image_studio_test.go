package model

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupImageStudioHistoryTest(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&ImageStudioGeneration{}))
	require.NoError(t, DB.Exec("DELETE FROM image_studio_generations").Error)

	setting := system_setting.GetAuditSetting()
	originalDisplayLimit := setting.ImageStudioDisplayHistoryLimit
	originalStorageLimit := setting.ImageStudioMaxHistory
	t.Cleanup(func() {
		setting.ImageStudioDisplayHistoryLimit = originalDisplayLimit
		setting.ImageStudioMaxHistory = originalStorageLimit
		_ = DB.Exec("DELETE FROM image_studio_generations").Error
	})
}

func createImageStudioHistoryRecord(t *testing.T, id string, createdAt int64) {
	t.Helper()
	require.NoError(t, CreateImageStudioGeneration(&ImageStudioGeneration{
		ID:        id,
		UserId:    42,
		CreatedAt: createdAt,
		Mode:      "generate",
		Prompt:    id,
		ModelName: "test-image-model",
		GroupName: "default",
		Size:      "1024x1024",
		N:         1,
		Images:    []ImageStudioAsset{},
	}))
}

func TestImageStudioDisplayHidingDoesNotDeleteStoredHistory(t *testing.T) {
	setupImageStudioHistoryTest(t)
	setting := system_setting.GetAuditSetting()
	setting.ImageStudioDisplayHistoryLimit = 2

	createImageStudioHistoryRecord(t, "oldest", 1)
	createImageStudioHistoryRecord(t, "middle", 2)
	createImageStudioHistoryRecord(t, "newest", 3)

	require.NoError(t, HideImageStudioGeneration("newest", 42, false))

	var storedCount int64
	require.NoError(t, DB.Model(&ImageStudioGeneration{}).Where("user_id = ?", 42).Count(&storedCount).Error)
	assert.Equal(t, int64(3), storedCount)

	visible, err := GetUserImageStudioGenerations(42, 0)
	require.NoError(t, err)
	require.Len(t, visible, 2)
	assert.Equal(t, "middle", visible[0].ID)
	assert.Equal(t, "oldest", visible[1].ID)
}

func TestImageStudioStoragePruningIncludesHiddenHistory(t *testing.T) {
	setupImageStudioHistoryTest(t)
	setting := system_setting.GetAuditSetting()
	setting.ImageStudioMaxHistory = 2

	createImageStudioHistoryRecord(t, "oldest", 1)
	createImageStudioHistoryRecord(t, "middle", 2)
	createImageStudioHistoryRecord(t, "newest", 3)
	require.NoError(t, HideImageStudioGeneration("newest", 42, false))

	pruned, err := PruneUserImageStudioGenerations(42, 0)
	require.NoError(t, err)
	require.Len(t, pruned, 1)
	assert.Equal(t, "oldest", pruned[0].ID)

	var stored []ImageStudioGeneration
	require.NoError(t, DB.Where("user_id = ?", 42).Order("created_at ASC").Find(&stored).Error)
	require.Len(t, stored, 2)
	assert.Equal(t, "middle", stored[0].ID)
	assert.Equal(t, "newest", stored[1].ID)
	assert.True(t, stored[1].HiddenFromStudio)
}

func TestClearingImageStudioHistoryOnlyHidesRecords(t *testing.T) {
	setupImageStudioHistoryTest(t)
	createImageStudioHistoryRecord(t, "first", 1)
	createImageStudioHistoryRecord(t, "second", 2)

	require.NoError(t, HideUserImageStudioGenerations(42))

	visible, err := GetUserImageStudioGenerations(42, 0)
	require.NoError(t, err)
	assert.Empty(t, visible)

	var storedCount int64
	require.NoError(t, DB.Model(&ImageStudioGeneration{}).Where("user_id = ?", 42).Count(&storedCount).Error)
	assert.Equal(t, int64(2), storedCount)
}
