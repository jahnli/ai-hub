package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type reportNotifySettingResponse struct {
	Frequency  int   `json:"frequency"`
	Quota      int64 `json:"quota"`
	QuotaLeave int64 `json:"quota_leave"`
}

type updateReportNotifySettingRequest struct {
	Frequency  int   `json:"frequency"`
	Quota      int64 `json:"quota"`
	QuotaLeave int64 `json:"quota_leave"`
}

func GetReportNotifySetting(c *gin.Context) {
	userId := c.GetInt("id")

	setting, err := model.GetReportNotifySettingByUserId(userId)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": reportNotifySettingResponse{
					Frequency:  0,
					Quota:      0,
					QuotaLeave: 0,
				},
			})
			return
		}
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": reportNotifySettingResponse{
			Frequency:  setting.Frequency,
			Quota:      setting.Quota,
			QuotaLeave: setting.QuotaLeave,
		},
	})
}

func UpdateReportNotifySetting(c *gin.Context) {
	userId := c.GetInt("id")
	username := c.GetString("username")

	var req updateReportNotifySettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if req.Frequency < 0 || req.Frequency > 3 {
		common.ApiErrorMsg(c, "frequency must be 0, 1, 2 or 3")
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

	err := model.UpsertReportNotifySetting(userId, username, req.Frequency, req.Quota, req.QuotaLeave)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
