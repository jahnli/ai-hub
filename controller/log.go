package controller

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

func enrichLogsWithLdapId(logs []*model.Log) {
	if len(logs) == 0 {
		return
	}
	userIdSet := make(map[int]struct{}, len(logs))
	for _, l := range logs {
		if l.UserId > 0 {
			userIdSet[l.UserId] = struct{}{}
		}
	}
	userIds := make([]int, 0, len(userIdSet))
	for id := range userIdSet {
		userIds = append(userIds, id)
	}
	extraMap, err := model.GetUserLogExtrasByIds(userIds)
	if err != nil || len(extraMap) == 0 {
		return
	}
	for _, l := range logs {
		if extra, ok := extraMap[l.UserId]; ok {
			l.LdapId = extra.LdapId
			l.AvatarUrl = extra.AvatarUrl
			l.OpenId = extra.OpenId
		}
	}
}

func GetAllLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	username := c.Query("username")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	requestId := c.Query("request_id")

	var userIds []int
	logs, total, err := model.GetAllLogs(logType, startTimestamp, endTimestamp, modelName, username, tokenName, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), channel, group, requestId, nil)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if total == 0 && username != "" {
		userIds, _ = model.GetUserIdsByLdapCn(username)
		if len(userIds) > 0 {
			logs, total, err = model.GetAllLogs(logType, startTimestamp, endTimestamp, modelName, "", tokenName, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), channel, group, requestId, userIds)
			if err != nil {
				common.ApiError(c, err)
				return
			}
		}
	}
	enrichLogsWithLdapId(logs)
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
	return
}

func GetUserLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	userId := c.GetInt("id")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	group := c.Query("group")
	requestId := c.Query("request_id")
	logs, total, err := model.GetUserLogs(userId, logType, startTimestamp, endTimestamp, modelName, tokenName, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), group, requestId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
	return
}

// Deprecated: SearchAllLogs 已废弃，前端未使用该接口。
func SearchAllLogs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "该接口已废弃",
	})
}

// Deprecated: SearchUserLogs 已废弃，前端未使用该接口。
func SearchUserLogs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "该接口已废弃",
	})
}

func GetLogByKey(c *gin.Context) {
	tokenId := c.GetInt("token_id")
	if tokenId == 0 {
		c.JSON(200, gin.H{
			"success": false,
			"message": "无效的令牌",
		})
		return
	}
	logs, err := model.GetLogByTokenId(tokenId)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
}

func GetLogsStat(c *gin.Context) {
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	username := c.Query("username")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")

	var userIds []int
	stat, err := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group, nil)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if stat.Quota == 0 && username != "" {
		userIds, _ = model.GetUserIdsByLdapCn(username)
		if len(userIds) > 0 {
			stat, err = model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, "", tokenName, channel, group, userIds)
			if err != nil {
				common.ApiError(c, err)
				return
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": stat.Quota,
			"rpm":   stat.Rpm,
			"tpm":   stat.Tpm,
		},
	})
	return
}

func GetLogsSelfStat(c *gin.Context) {
	username := c.GetString("username")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	quotaNum, err := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group, nil)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	//tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, tokenName)
	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": quotaNum.Quota,
			"rpm":   quotaNum.Rpm,
			"tpm":   quotaNum.Tpm,
			//"token": tokenNum,
		},
	})
	return
}

func DeleteHistoryLogs(c *gin.Context) {
	targetTimestamp, _ := strconv.ParseInt(c.Query("target_timestamp"), 10, 64)
	if targetTimestamp == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "target timestamp is required",
		})
		return
	}
	count, err := model.DeleteOldLog(c.Request.Context(), targetTimestamp, 100)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if _, msgErr := model.DeleteOldRequestMessages(c.Request.Context(), targetTimestamp, 100); msgErr != nil {
		common.SysLog("failed to delete old request messages: " + msgErr.Error())
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
	return
}

func isSuperAdmin(c *gin.Context) bool {
	return c.GetInt("role") >= common.RoleRootUser
}

func GetLogMessages(c *gin.Context) {
	if !isSuperAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "无权访问",
		})
		return
	}
	requestId := c.Query("request_id")
	if requestId == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "request_id is required",
		})
		return
	}
	rm, err := model.GetRequestMessageByRequestId(requestId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rm,
	})
}

func GetLogMessagesBatch(c *gin.Context) {
	if !isSuperAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "无权访问",
		})
		return
	}
	requestIdsStr := c.Query("request_ids")
	if requestIdsStr == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    map[string]string{},
		})
		return
	}
	requestIds := strings.Split(requestIdsStr, ",")
	if len(requestIds) > 100 {
		requestIds = requestIds[:100]
	}
	summaries, err := model.GetRequestMessageSummariesByRequestIds(requestIds)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
	})
}

type notifyViolationRequest struct {
	RequestId  string `json:"request_id"`
	UserId     int    `json:"user_id"`
	ModelName  string `json:"model_name"`
	CreatedAt  int64  `json:"created_at"`
}

func NotifyViolation(c *gin.Context) {
	if !isSuperAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "无权访问"})
		return
	}

	var req notifyViolationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误: " + err.Error()})
		return
	}
	if req.RequestId == "" || req.UserId == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "request_id 和 user_id 不能为空"})
		return
	}

	extras, err := model.GetUserLogExtrasByIds([]int{req.UserId})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "查询用户信息失败: " + err.Error()})
		return
	}
	extra, ok := extras[req.UserId]
	if !ok || extra.OpenId == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "该用户未绑定飞书账号，无法发送通知"})
		return
	}

	requestTime := time.Unix(req.CreatedAt, 0).Format("2006-01-02 15:04:05")
	cardJSON := service.BuildViolationCard(requestTime, req.RequestId, req.ModelName)

	if err := service.SendCardMessage(extra.OpenId, cardJSON); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "发送飞书通知失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "通知已发送"})
}
