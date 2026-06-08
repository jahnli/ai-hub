package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetReportNotifySettingSelf returns the current user's report notification setting.
// If no record exists, returns all-zero defaults.
func GetReportNotifySettingSelf(c *gin.Context) {
	userId := c.GetInt("id")
	setting, err := model.GetReportNotifySettingByUserId(userId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiSuccess(c, gin.H{
				"frequency":   0,
				"quota":       0,
				"quota_leave": 0,
			})
			return
		}
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"frequency":   setting.Frequency,
			"quota":       setting.Quota,
			"quota_leave": setting.QuotaLeave,
		},
	})
}

type updateReportNotifyRequest struct {
	Frequency  int   `json:"frequency"`
	Quota      int64 `json:"quota"`
	QuotaLeave int64 `json:"quota_leave"`
}

// UpdateReportNotifySettingSelf saves the current user's report notification setting.
// Always upserts — never deletes the record.
func UpdateReportNotifySettingSelf(c *gin.Context) {
	userId := c.GetInt("id")
	username := c.GetString("username")

	var req updateReportNotifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}

	if err := model.ValidateFrequency(req.Frequency); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.Quota < 0 {
		common.ApiErrorMsg(c, "quota must be >= 0")
		return
	}
	if req.QuotaLeave < 0 {
		common.ApiErrorMsg(c, "quota_leave must be >= 0")
		return
	}

	fields := model.ReportNotifySettingFields{
		Frequency:  req.Frequency,
		Quota:      req.Quota,
		QuotaLeave: req.QuotaLeave,
	}
	if err := model.UpsertReportNotifySetting(userId, username, fields); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}
