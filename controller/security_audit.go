package controller

import (
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

// GetSecurityAuditSetting 供管理员(role >= admin)读取审计配置。
// /api/option/ 为 root 专属,普通管理员打开审计页时需要单独入口获取时段与开关。
func GetSecurityAuditSetting(c *gin.Context) {
	auditSetting := system_setting.GetAuditSetting()
	common.ApiSuccess(c, auditSetting)
}

func GetOffHoursUsage(c *gin.Context) {
	offHoursSetting := system_setting.GetAuditSetting().OffHours
	if !offHoursSetting.Enabled {
		common.ApiErrorMsg(c, "安全审计功能未启用")
		return
	}
	pageInfo := common.GetPageQuery(c)
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	if endTimestamp <= 0 {
		endTimestamp = time.Now().Unix()
	}
	if startTimestamp <= 0 {
		startTimestamp = endTimestamp - 7*86400
	}
	username := c.Query("username")
	items, total, err := model.GetOffHoursUsage(startTimestamp, endTimestamp,
		offHoursSetting.StartHour, offHoursSetting.EndHour,
		username, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

// GetImageStudioAudit 管理员分页查看在线生图记录,支持时间范围与用户名/显示名模糊筛选。
func GetImageStudioAudit(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	now := time.Now().Unix()
	// 钳制未来时间,同时保证 model 层秒转毫秒不会溢出
	if endTimestamp <= 0 || endTimestamp > now+86400 {
		endTimestamp = now
	}
	if startTimestamp <= 0 {
		startTimestamp = endTimestamp - 30*86400
	}
	if startTimestamp > endTimestamp {
		common.ApiErrorMsg(c, "时间范围无效:开始时间必须早于结束时间")
		return
	}
	items, total, err := model.GetImageStudioAuditGenerations(startTimestamp, endTimestamp,
		c.Query("username"), pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}
