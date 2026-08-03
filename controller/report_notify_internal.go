package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetReportNotifyUserReports(c *gin.Context) {
	var req service.ReportNotifyUserReportsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request body"})
		return
	}
	if req.UserID <= 0 || req.StartTimestamp <= 0 || req.EndTimestamp <= 0 || req.StartTimestamp > req.EndTimestamp {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": service.ErrReportNotifyTimeRange.Error()})
		return
	}

	data, err := service.GetReportNotifyUserReports(&req)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, service.ErrReportNotifyUserUnavailable) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}
