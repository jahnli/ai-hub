package model

import (
	"time"
)

type ReportNotifySetting struct {
	Id        int       `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId    int       `json:"user_id" gorm:"not null;uniqueIndex"`
	Username  string    `json:"username" gorm:"type:varchar(64);not null;default:''"`
	Frequency int       `json:"frequency" gorm:"type:smallint;not null;default:0"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	Quota     int64     `json:"quota" gorm:"not null;default:0"`
	QuotaLeave int64   `json:"quota_leave" gorm:"not null;default:0"`
}

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

func UpsertReportNotifySetting(userId int, username string, frequency int, quota int64, quotaLeave int64) error {
	var existing ReportNotifySetting
	err := DB.Where("user_id = ?", userId).First(&existing).Error
	if err != nil {
		setting := ReportNotifySetting{
			UserId:     userId,
			Username:   username,
			Frequency:  frequency,
			Quota:      quota,
			QuotaLeave: quotaLeave,
		}
		return DB.Create(&setting).Error
	}
	return DB.Model(&existing).Updates(map[string]interface{}{
		"username":    username,
		"frequency":   frequency,
		"quota":       quota,
		"quota_leave": quotaLeave,
	}).Error
}
