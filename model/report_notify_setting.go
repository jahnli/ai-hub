package model

import (
	"errors"
	"time"
)

type ReportNotifySetting struct {
	Id         int       `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId     int       `json:"user_id" gorm:"uniqueIndex;not null"`
	Username   string    `json:"username" gorm:"type:varchar(64);not null"`
	Frequency  int       `json:"frequency" gorm:"type:int;not null;default:0"`
	Quota      int64     `json:"quota" gorm:"type:bigint;not null;default:0"`
	QuotaLeave int64     `json:"quota_leave" gorm:"type:bigint;not null;default:0"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TableName specifies the table name (table already exists, do not auto-migrate this model).
func (ReportNotifySetting) TableName() string {
	return "report_notify_settings"
}

func GetReportNotifySettingByUserId(userId int) (*ReportNotifySetting, error) {
	var setting ReportNotifySetting
	err := DB.Where("user_id = ?", userId).First(&setting).Error
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

type ReportNotifySettingFields struct {
	Frequency  int
	Quota      int64
	QuotaLeave int64
}

func UpsertReportNotifySetting(userId int, username string, fields ReportNotifySettingFields) error {
	now := time.Now()
	var existing ReportNotifySetting
	err := DB.Where("user_id = ?", userId).First(&existing).Error
	if err != nil {
		setting := ReportNotifySetting{
			UserId:     userId,
			Username:   username,
			Frequency:  fields.Frequency,
			Quota:      fields.Quota,
			QuotaLeave: fields.QuotaLeave,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		return DB.Create(&setting).Error
	}
	return DB.Model(&existing).Updates(map[string]interface{}{
		"frequency":   fields.Frequency,
		"quota":       fields.Quota,
		"quota_leave": fields.QuotaLeave,
		"username":    username,
		"updated_at":  now,
	}).Error
}

func ValidateFrequency(frequency int) error {
	if frequency < 0 || frequency > 3 {
		return errors.New("frequency must be 0, 1, 2, or 3")
	}
	return nil
}
