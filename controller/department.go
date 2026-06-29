package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

func GetDepartmentTree(c *gin.Context) {
	userID := c.GetInt("id")
	userRole := c.GetInt("role")

	resp, err := service.GetDepartmentTree(userID, userRole)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

func GetDepartmentStats(c *gin.Context) {
	var req service.DepartmentStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.DepartmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "department_id is required",
		})
		return
	}

	stat, err := service.GetDepartmentStats(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stat,
	})
}

func GetSubDepartmentStats(c *gin.Context) {
	var req service.DepartmentStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.DepartmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "department_id is required",
		})
		return
	}

	items, err := service.GetSubDepartmentStats(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
	})
}

func GetUsageAnalysis(c *gin.Context) {
	var req service.DepartmentStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.DepartmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "department_id is required",
		})
		return
	}

	data, err := service.GetUsageAnalysis(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func GetDepartmentUsers(c *gin.Context) {
	var req service.DepartmentUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.DepartmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "department_id is required",
		})
		return
	}

	data, err := service.GetDepartmentUsers(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func GetDepartmentUserRankings(c *gin.Context) {
	var req service.DepartmentUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.DepartmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "department_id is required",
		})
		return
	}

	data, err := service.GetDepartmentUserRankings(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}
