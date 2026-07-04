package model

import (
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const ImageStudioHistoryLimit = 10

type ImageStudioGeneration struct {
	ID               string             `json:"id" gorm:"type:varchar(64);primaryKey"`
	UserId           int                `json:"user_id" gorm:"index"`
	CreatedAt        int64              `json:"created_at" gorm:"index"`
	UpdatedAt        int64              `json:"updated_at"`
	Mode             string             `json:"mode" gorm:"type:varchar(20);index"`
	Prompt           string             `json:"prompt" gorm:"type:text"`
	ModelName        string             `json:"model" gorm:"type:varchar(191);column:model_name;index"`
	GroupName        string             `json:"group" gorm:"type:varchar(100);column:group_name;index"`
	Size             string             `json:"size" gorm:"type:varchar(50)"`
	Quality          string             `json:"quality,omitempty" gorm:"type:varchar(50)"`
	Moderation       string             `json:"moderation,omitempty" gorm:"type:varchar(50)"`
	OutputFormat     string             `json:"output_format,omitempty" gorm:"type:varchar(20)"`
	N                int                `json:"n"`
	DurationMs       int64              `json:"duration_ms"`
	Quota            int                `json:"quota,omitempty"`
	PromptTokens     int                `json:"prompt_tokens,omitempty"`
	CompletionTokens int                `json:"completion_tokens,omitempty"`
	Favorite         bool               `json:"favorite" gorm:"index"`
	ImagesText       string             `json:"-" gorm:"type:text;column:images"`
	Images           []ImageStudioAsset `json:"images" gorm:"-"`
}

type ImageStudioAsset struct {
	ID            string `json:"id"`
	Path          string `json:"path,omitempty"`
	URL           string `json:"url"`
	MimeType      string `json:"mime_type"`
	SizeBytes     int64  `json:"size_bytes"`
	Width         int    `json:"width,omitempty"`
	Height        int    `json:"height,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

func GetImageStudioAsset(id string) (*ImageStudioAsset, error) {
	var records []ImageStudioGeneration
	if err := DB.Where("images LIKE ?", "%"+id+"%").Find(&records).Error; err != nil {
		return nil, err
	}
	for i := range records {
		if err := loadImageStudioGenerationImages(&records[i]); err != nil {
			return nil, err
		}
		for j := range records[i].Images {
			asset := records[i].Images[j]
			if asset.ID == id || asset.Path == id {
				return &asset, nil
			}
		}
	}
	return nil, errors.New("image studio asset not found")
}

func CreateImageStudioGeneration(record *ImageStudioGeneration) error {
	now := time.Now().UnixMilli()
	if record.CreatedAt == 0 {
		record.CreatedAt = now
	}
	record.UpdatedAt = now
	if err := saveImageStudioGenerationImages(record); err != nil {
		return err
	}
	return DB.Create(record).Error
}

func GetUserImageStudioGenerations(userID int, limit int) ([]ImageStudioGeneration, error) {
	if limit <= 0 || limit > ImageStudioHistoryLimit {
		limit = ImageStudioHistoryLimit
	}
	var records []ImageStudioGeneration
	if err := DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(limit).Find(&records).Error; err != nil {
		return nil, err
	}
	return records, loadImageStudioGenerationListImages(records)
}

func GetImageStudioGeneration(id string, userID int, isAdmin bool) (*ImageStudioGeneration, error) {
	var record ImageStudioGeneration
	query := DB.Where("id = ?", id)
	if !isAdmin {
		query = query.Where("user_id = ?", userID)
	}
	if err := query.First(&record).Error; err != nil {
		return nil, err
	}
	return &record, loadImageStudioGenerationImages(&record)
}

func DeleteImageStudioGeneration(id string, userID int, isAdmin bool) (*ImageStudioGeneration, error) {
	record, err := GetImageStudioGeneration(id, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	return record, DB.Delete(&ImageStudioGeneration{}, "id = ?", record.ID).Error
}

func DeleteUserImageStudioGenerations(userID int) ([]ImageStudioGeneration, error) {
	var records []ImageStudioGeneration
	if err := DB.Where("user_id = ?", userID).Find(&records).Error; err != nil {
		return nil, err
	}
	if err := loadImageStudioGenerationListImages(records); err != nil {
		return nil, err
	}
	return records, DB.Where("user_id = ?", userID).Delete(&ImageStudioGeneration{}).Error
}

func PruneUserImageStudioGenerations(userID int, limit int) ([]ImageStudioGeneration, error) {
	if limit <= 0 {
		limit = ImageStudioHistoryLimit
	}
	var records []ImageStudioGeneration
	if err := DB.Where("user_id = ?", userID).Order("created_at DESC").Offset(limit).Find(&records).Error; err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return records, nil
	}
	if err := loadImageStudioGenerationListImages(records); err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(records))
	for _, record := range records {
		ids = append(ids, record.ID)
	}
	return records, DB.Where("id IN ?", ids).Delete(&ImageStudioGeneration{}).Error
}

func UpdateImageStudioGenerationFavorite(id string, userID int, favorite bool) error {
	res := DB.Model(&ImageStudioGeneration{}).Where("id = ? AND user_id = ?", id, userID).Updates(map[string]any{
		"favorite":   favorite,
		"updated_at": time.Now().UnixMilli(),
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("generation not found")
	}
	return nil
}

func UpdateImageStudioGenerationUsage(id string, userID int, quota int, promptTokens int, completionTokens int) error {
	return DB.Model(&ImageStudioGeneration{}).Where("id = ? AND user_id = ?", id, userID).Updates(map[string]any{
		"quota":             quota,
		"prompt_tokens":     promptTokens,
		"completion_tokens": completionTokens,
		"updated_at":        time.Now().UnixMilli(),
	}).Error
}

func saveImageStudioGenerationImages(record *ImageStudioGeneration) error {
	for i := range record.Images {
		if record.Images[i].Path == "" {
			record.Images[i].Path = record.Images[i].ID
		}
	}
	data, err := common.Marshal(record.Images)
	if err != nil {
		return err
	}
	record.ImagesText = string(data)
	return nil
}

func loadImageStudioGenerationListImages(records []ImageStudioGeneration) error {
	for i := range records {
		if err := loadImageStudioGenerationImages(&records[i]); err != nil {
			return err
		}
	}
	return nil
}

func loadImageStudioGenerationImages(record *ImageStudioGeneration) error {
	if record.ImagesText == "" {
		record.Images = []ImageStudioAsset{}
		return nil
	}
	var images []ImageStudioAsset
	if err := common.UnmarshalJsonStr(record.ImagesText, &images); err != nil {
		return err
	}
	for i := range images {
		if images[i].Path == "" {
			images[i].Path = images[i].ID
		}
	}
	record.Images = images
	return nil
}
