package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

type cascaderNode struct {
	Value    string          `json:"value"`
	Label    string          `json:"label"`
	Children []*cascaderNode `json:"children"`
	Disabled bool            `json:"disabled,omitempty"`
}

type deptPathEntry struct {
	DepartmentPath struct {
		DepartmentIds      []string `json:"department_ids"`
		DepartmentPathName struct {
			Name string `json:"name"`
		} `json:"department_path_name"`
	} `json:"department_path"`
}

type departmentUserItem struct {
	Name                   string `json:"name"`
	Registered             bool   `json:"registered"`
	Id                     int    `json:"id,omitempty"`
	Username               string `json:"username,omitempty"`
	DisplayName            string `json:"display_name,omitempty"`
	Quota                  int    `json:"quota,omitempty"`
	UsedQuota              int    `json:"used_quota,omitempty"`
	RequestCount           int    `json:"request_count,omitempty"`
	Email                  string `json:"email,omitempty"`
	SubQuotaTotal          int64  `json:"sub_quota_total,omitempty"`
	SubQuotaUsed           int64  `json:"sub_quota_used,omitempty"`
	TotalConsumedQuota     int64  `json:"total_consumed_quota,omitempty"`
	TotalPromptTokens      int64  `json:"total_prompt_tokens,omitempty"`
	TotalCompletionTokens  int64  `json:"total_completion_tokens,omitempty"`
	TopModel               string `json:"top_model,omitempty"`
	SubscriptionResetCount int    `json:"subscription_reset_count,omitempty"`
	LastLoginAt            int64  `json:"last_login_at,omitempty"`
	CreatedAt              string `json:"created_at,omitempty"`
}

func buildFullTree(departments []*service.FeishuDepartment) []*cascaderNode {
	nodeMap := make(map[string]*cascaderNode, len(departments))
	for _, dept := range departments {
		nodeMap[dept.DepartmentId] = &cascaderNode{
			Value:    dept.DepartmentId,
			Label:    dept.GetName(),
			Children: make([]*cascaderNode, 0),
		}
	}

	roots := make([]*cascaderNode, 0)
	for _, dept := range departments {
		node := nodeMap[dept.DepartmentId]
		parentId := dept.ParentDepartmentId
		if parentId == "" || parentId == "0" {
			roots = append(roots, node)
		} else if parentNode, ok := nodeMap[parentId]; ok {
			parentNode.Children = append(parentNode.Children, node)
		} else {
			roots = append(roots, node)
		}
	}

	return roots
}

func filterTreeForLeader(tree []*cascaderNode, ancestorSet map[string]bool, leaderDeptId string) []*cascaderNode {
	var result []*cascaderNode
	for _, node := range tree {
		if node.Value == leaderDeptId {
			result = append(result, node)
			continue
		}
		if ancestorSet[node.Value] {
			pruned := &cascaderNode{
				Value:    node.Value,
				Label:    node.Label,
				Disabled: true,
				Children: filterTreeForLeader(node.Children, ancestorSet, leaderDeptId),
			}
			result = append(result, pruned)
		}
	}
	return result
}

func collectDescendantIds(rootId string, departments []*service.FeishuDepartment, result map[string]bool) {
	result[rootId] = true
	for _, dept := range departments {
		if dept.ParentDepartmentId == rootId && !result[dept.DepartmentId] {
			collectDescendantIds(dept.DepartmentId, departments, result)
		}
	}
}

func GetDepartmentTree(c *gin.Context) {
	role := c.GetInt("role")

	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取飞书凭证失败: " + err.Error(),
		})
		return
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取部门列表失败: " + err.Error(),
		})
		return
	}

	fullTree := buildFullTree(departments)

	if role >= 10 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    fullTree,
		})
		return
	}

	user, err := model.GetUserById(c.GetInt("id"), false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户信息不可用",
		})
		return
	}

	feishuId := user.OpenId

	leaderDeptIds := make([]string, 0)
	for _, dept := range departments {
		if dept.LeaderUserId == feishuId {
			leaderDeptIds = append(leaderDeptIds, dept.DepartmentId)
		}
	}

	if len(leaderDeptIds) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    []*cascaderNode{},
		})
		return
	}

	ancestorIds, _, _ := parseUserDeptPath(user.DepartmentPath)

	ancestorSet := make(map[string]bool, len(ancestorIds))
	for _, id := range ancestorIds {
		ancestorSet[id] = true
	}

	var filteredTree []*cascaderNode
	for _, leaderDeptId := range leaderDeptIds {
		pruned := filterTreeForLeader(fullTree, ancestorSet, leaderDeptId)
		if len(pruned) > 0 {
			filteredTree = mergeTreeRoots(filteredTree, pruned)
		}
	}

	if filteredTree == nil {
		filteredTree = make([]*cascaderNode, 0)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "",
		"data":            filteredTree,
		"leader_dept_ids": leaderDeptIds,
	})
}

func mergeTreeRoots(existing, incoming []*cascaderNode) []*cascaderNode {
	if len(existing) == 0 {
		return incoming
	}

	existingMap := make(map[string]*cascaderNode, len(existing))
	for _, node := range existing {
		existingMap[node.Value] = node
	}

	for _, node := range incoming {
		if ex, ok := existingMap[node.Value]; ok {
			ex.Children = mergeTreeRoots(ex.Children, node.Children)
		} else {
			existing = append(existing, node)
			existingMap[node.Value] = node
		}
	}

	return existing
}

func GetDepartmentUsers(c *gin.Context) {
	deptId := c.Query("dept_id")
	if deptId == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "dept_id is required",
		})
		return
	}

	includeChildren := c.DefaultQuery("include_children", "true") == "true"
	startTime, _ := strconv.ParseInt(c.DefaultQuery("start_time", "0"), 10, 64)
	endTime, _ := strconv.ParseInt(c.DefaultQuery("end_time", "0"), 10, 64)
	role := c.GetInt("role")

	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取飞书凭证失败: " + err.Error(),
		})
		return
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取部门列表失败: " + err.Error(),
		})
		return
	}

	if role < 10 {
		user, err := model.GetUserById(c.GetInt("id"), false)
		if err != nil || user == nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户信息不可用",
			})
			return
		}

		feishuId := user.OpenId

		leaderDeptIds := make([]string, 0)
		for _, dept := range departments {
			if dept.LeaderUserId == feishuId {
				leaderDeptIds = append(leaderDeptIds, dept.DepartmentId)
			}
		}

		allowedIds := make(map[string]bool)
		for _, rootId := range leaderDeptIds {
			collectDescendantIds(rootId, departments, allowedIds)
		}

		if !allowedIds[deptId] {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "",
				"data":    []departmentUserItem{},
			})
			return
		}
	}

	targetDeptIds := []string{deptId}
	if includeChildren {
		descendantIds := make(map[string]bool)
		collectDescendantIds(deptId, departments, descendantIds)
		for id := range descendantIds {
			if id != deptId {
				targetDeptIds = append(targetDeptIds, id)
			}
		}
	}

	feishuUsers, err := service.FetchDepartmentUsers(tenantToken, targetDeptIds)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取部门成员失败: " + err.Error(),
		})
		return
	}

	// 调试日志：打印飞书返回的成员列表
	for _, fu := range feishuUsers {
		common.SysLog(fmt.Sprintf("[DeptUsers Debug] Feishu user: name=%s, open_id=%s, user_id=%s, email=%s",
			fu.Name, fu.OpenId, fu.UserId, fu.Email))
	}

	feishuOpenIds := make([]string, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		feishuOpenIds = append(feishuOpenIds, fu.OpenId)
	}

	localUserMap := make(map[string]*model.User)
	if len(feishuOpenIds) > 0 {
		var localUsers []model.User
		model.DB.Model(&model.User{}).
			Where("open_id IN ?", feishuOpenIds).
			Find(&localUsers)

		// 调试日志：打印数据库中匹配到的用户
		common.SysLog(fmt.Sprintf("[DeptUsers Debug] Query open_ids: %v", feishuOpenIds))
		common.SysLog(fmt.Sprintf("[DeptUsers Debug] Found %d local users matching", len(localUsers)))
		for _, lu := range localUsers {
			common.SysLog(fmt.Sprintf("[DeptUsers Debug] Local user: id=%d, username=%s, open_id=%s",
				lu.Id, lu.Username, lu.OpenId))
		}

		for i := range localUsers {
			localUserMap[localUsers[i].OpenId] = &localUsers[i]
		}
	}

	registeredUserIds := make([]int, 0)
	for _, lu := range localUserMap {
		registeredUserIds = append(registeredUserIds, lu.Id)
	}

	var subscriptionSummaries map[int]model.SubscriptionQuotaSummary
	var consumptionSummaries map[int]model.UserConsumptionSummary
	var topModels map[int]string
	if len(registeredUserIds) > 0 {
		subscriptionSummaries, _ = model.GetActiveSubscriptionQuotaSummaryByUserIds(registeredUserIds)
		consumptionSummaries, _ = model.GetUserConsumptionSummaryByIdsWithTimeRange(registeredUserIds, startTime, endTime)
		topModels, _ = model.GetTopModelByUserIdsWithTimeRange(registeredUserIds, startTime, endTime)
	}

	result := make([]departmentUserItem, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		item := departmentUserItem{
			Name: fu.Name,
		}
		if lu, ok := localUserMap[fu.OpenId]; ok {
			item.Registered = true
			item.Id = lu.Id
			item.Username = lu.Username
			item.DisplayName = lu.DisplayName
			item.Quota = lu.Quota
			item.UsedQuota = lu.UsedQuota
			item.RequestCount = lu.RequestCount
			item.Email = lu.Email
			item.LastLoginAt = lu.LastLoginAt
			item.CreatedAt = lu.CreatedAt.Format("2006-01-02 15:04:05")

			if s, ok := subscriptionSummaries[lu.Id]; ok {
				item.SubQuotaTotal = s.AmountTotal
				item.SubQuotaUsed = s.AmountUsed
				item.SubscriptionResetCount = s.ResetCount
			}
			if c, ok := consumptionSummaries[lu.Id]; ok {
				item.TotalConsumedQuota = c.TotalQuota
				item.TotalPromptTokens = c.TotalPrompt
				item.TotalCompletionTokens = c.TotalCompletion
			}
			if m, ok := topModels[lu.Id]; ok {
				item.TopModel = m
			}
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

func parseUserDeptPath(raw string) (ids []string, names []string, err error) {
	if raw == "" {
		return nil, nil, nil
	}

	var entries []deptPathEntry
	if err := json.Unmarshal([]byte(raw), &entries); err != nil {
		return nil, nil, err
	}

	if len(entries) == 0 {
		return nil, nil, nil
	}

	entry := entries[0]
	ids = entry.DepartmentPath.DepartmentIds
	pathName := entry.DepartmentPath.DepartmentPathName.Name
	if pathName != "" {
		names = strings.Split(pathName, "-")
	}

	return ids, names, nil
}

func getDeptRegisteredUserIds(c *gin.Context, deptId string) ([]int, error) {
	role := c.GetInt("role")

	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		return nil, fmt.Errorf("获取飞书凭证失败: %s", err.Error())
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		return nil, fmt.Errorf("获取部门列表失败: %s", err.Error())
	}

	if role < 10 {
		user, err := model.GetUserById(c.GetInt("id"), false)
		if err != nil || user == nil {
			return nil, fmt.Errorf("用户信息不可用")
		}

		feishuId := user.OpenId
		leaderDeptIds := make([]string, 0)
		for _, dept := range departments {
			if dept.LeaderUserId == feishuId {
				leaderDeptIds = append(leaderDeptIds, dept.DepartmentId)
			}
		}

		allowedIds := make(map[string]bool)
		for _, rootId := range leaderDeptIds {
			collectDescendantIds(rootId, departments, allowedIds)
		}
		if !allowedIds[deptId] {
			return nil, fmt.Errorf("权限不足")
		}
	}

	descendantIds := make(map[string]bool)
	collectDescendantIds(deptId, departments, descendantIds)
	targetDeptIds := make([]string, 0, len(descendantIds))
	for id := range descendantIds {
		targetDeptIds = append(targetDeptIds, id)
	}

	feishuUsers, err := service.FetchDepartmentUsers(tenantToken, targetDeptIds)
	if err != nil {
		return nil, fmt.Errorf("获取部门成员失败: %s", err.Error())
	}

	feishuOpenIds := make([]string, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		feishuOpenIds = append(feishuOpenIds, fu.OpenId)
	}

	if len(feishuOpenIds) == 0 {
		return []int{}, nil
	}

	var localUsers []model.User
	model.DB.Model(&model.User{}).
		Select("id").
		Where("open_id IN ?", feishuOpenIds).
		Find(&localUsers)

	userIds := make([]int, 0, len(localUsers))
	for _, lu := range localUsers {
		userIds = append(userIds, lu.Id)
	}
	return userIds, nil
}

func GetDepartmentStats(c *gin.Context) {
	deptId := c.Query("dept_id")
	if deptId == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "dept_id is required",
		})
		return
	}

	startTimeStr := c.DefaultQuery("start_time", "0")
	endTimeStr := c.DefaultQuery("end_time", "0")
	startTime, _ := strconv.ParseInt(startTimeStr, 10, 64)
	endTime, _ := strconv.ParseInt(endTimeStr, 10, 64)

	userIds, err := getDeptRegisteredUserIds(c, deptId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if len(userIds) == 0 {
		common.ApiSuccess(c, gin.H{
			"overview":           gin.H{},
			"model_distribution": []model.UserModelDistribution{},
			"trend_data":         []*model.QuotaData{},
			"recent_logs":        []*model.Log{},
		})
		return
	}

	overview, err := model.GetUsersStatsOverviewWithTimeRange(userIds, startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var tokenCount int64
	for _, uid := range userIds {
		cnt, e := model.CountUserTokens(uid)
		if e == nil {
			tokenCount += cnt
		}
	}

	var subTotal, subUsed int64
	for _, uid := range userIds {
		subs, e := model.GetAllActiveUserSubscriptions(uid)
		if e == nil {
			for _, s := range subs {
				if s.Subscription != nil {
					subTotal += s.Subscription.AmountTotal
					subUsed += s.Subscription.AmountUsed
				}
			}
		}
	}

	modelDist, err := model.GetUsersModelDistributionWithTimeRange(userIds, startTime, endTime)
	if err != nil {
		modelDist = []model.UserModelDistribution{}
	}

	var trendData []*model.QuotaData
	if startTime > 0 && endTime > 0 {
		trendData, err = model.GetQuotaDataByUserIds(userIds, startTime, endTime)
		if err != nil {
			trendData = []*model.QuotaData{}
		}
	}

	common.ApiSuccess(c, gin.H{
		"overview": gin.H{
			"total_quota":       overview.TotalQuota,
			"total_prompt":      overview.TotalPrompt,
			"total_completion":  overview.TotalCompletion,
			"total_requests":    overview.TotalRequests,
			"avg_response_time": overview.AvgResponseTime,
			"error_count":       overview.ErrorCount,
			"consume_count":     overview.ConsumeCount,
			"token_count":       tokenCount,
			"sub_quota_total":   subTotal,
			"sub_quota_used":    subUsed,
		},
		"model_distribution": modelDist,
		"trend_data":         trendData,
	})
}

func GetDepartmentChildrenStats(c *gin.Context) {
	deptId := c.Query("dept_id")
	if deptId == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "dept_id is required"})
		return
	}

	startTime, _ := strconv.ParseInt(c.DefaultQuery("start_time", "0"), 10, 64)
	endTime, _ := strconv.ParseInt(c.DefaultQuery("end_time", "0"), 10, 64)

	role := c.GetInt("role")
	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		common.ApiError(c, fmt.Errorf("获取飞书凭证失败: %s", err.Error()))
		return
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		common.ApiError(c, fmt.Errorf("获取部门列表失败: %s", err.Error()))
		return
	}

	if role < 10 {
		user, err := model.GetUserById(c.GetInt("id"), false)
		if err != nil || user == nil {
			common.ApiError(c, fmt.Errorf("用户信息不可用"))
			return
		}
		feishuId := user.OpenId
		leaderDeptIds := make([]string, 0)
		for _, dept := range departments {
			if dept.LeaderUserId == feishuId {
				leaderDeptIds = append(leaderDeptIds, dept.DepartmentId)
			}
		}
		allowedIds := make(map[string]bool)
		for _, rootId := range leaderDeptIds {
			collectDescendantIds(rootId, departments, allowedIds)
		}
		if !allowedIds[deptId] {
			common.ApiError(c, fmt.Errorf("权限不足"))
			return
		}
	}

	directChildren := make([]*service.FeishuDepartment, 0)
	for _, dept := range departments {
		if dept.ParentDepartmentId == deptId {
			directChildren = append(directChildren, dept)
		}
	}

	if len(directChildren) == 0 {
		common.ApiSuccess(c, gin.H{"children": []gin.H{}})
		return
	}

	allDescendantIds := make(map[string]bool)
	collectDescendantIds(deptId, departments, allDescendantIds)
	allDeptIds := make([]string, 0, len(allDescendantIds))
	for id := range allDescendantIds {
		allDeptIds = append(allDeptIds, id)
	}

	allFeishuUsers, err := service.FetchDepartmentUsers(tenantToken, allDeptIds)
	if err != nil {
		common.ApiError(c, fmt.Errorf("获取部门成员失败: %s", err.Error()))
		return
	}

	childDescendants := make(map[string]map[string]bool, len(directChildren))
	for _, child := range directChildren {
		desc := make(map[string]bool)
		collectDescendantIds(child.DepartmentId, departments, desc)
		childDescendants[child.DepartmentId] = desc
	}

	childFeishuUsers := make(map[string][]string, len(directChildren))
	for _, fu := range allFeishuUsers {
		for _, child := range directChildren {
			matched := false
			for _, dId := range fu.DepartmentIds {
				if childDescendants[child.DepartmentId][dId] {
					matched = true
					break
				}
			}
			if matched {
				childFeishuUsers[child.DepartmentId] = append(childFeishuUsers[child.DepartmentId], fu.OpenId)
				break
			}
		}
	}

	type childStat struct {
		DeptId          string `json:"dept_id"`
		DeptName        string `json:"dept_name"`
		MemberCount     int    `json:"member_count"`
		RegisteredCount int    `json:"registered_count"`
		TotalQuota      int64  `json:"total_quota"`
		TotalPrompt     int64  `json:"total_prompt"`
		TotalCompletion int64  `json:"total_completion"`
		TotalRequests   int64  `json:"total_requests"`
		SubQuotaTotal   int64  `json:"sub_quota_total"`
		SubQuotaUsed    int64  `json:"sub_quota_used"`
	}

	results := make([]childStat, 0, len(directChildren))
	for _, child := range directChildren {
		openIds := childFeishuUsers[child.DepartmentId]
		stat := childStat{
			DeptId:      child.DepartmentId,
			DeptName:    child.GetName(),
			MemberCount: len(openIds),
		}

		if len(openIds) == 0 {
			results = append(results, stat)
			continue
		}

		var localUsers []model.User
		model.DB.Model(&model.User{}).Select("id").Where("open_id IN ?", openIds).Find(&localUsers)
		userIds := make([]int, 0, len(localUsers))
		for _, lu := range localUsers {
			userIds = append(userIds, lu.Id)
		}
		stat.RegisteredCount = len(userIds)

		if len(userIds) > 0 {
			overview, err := model.GetUsersStatsOverviewWithTimeRange(userIds, startTime, endTime)
			if err == nil {
				stat.TotalQuota = overview.TotalQuota
				stat.TotalPrompt = overview.TotalPrompt
				stat.TotalCompletion = overview.TotalCompletion
				stat.TotalRequests = overview.TotalRequests
			}

			for _, uid := range userIds {
				subs, e := model.GetAllActiveUserSubscriptions(uid)
				if e == nil {
					for _, s := range subs {
						if s.Subscription != nil {
							stat.SubQuotaTotal += s.Subscription.AmountTotal
							stat.SubQuotaUsed += s.Subscription.AmountUsed
						}
					}
				}
			}
		}

		results = append(results, stat)
	}

	common.ApiSuccess(c, gin.H{"children": results})
}

func GetDepartmentLogs(c *gin.Context) {
	deptId := c.Query("dept_id")
	if deptId == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "dept_id is required",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	userIds, err := getDeptRegisteredUserIds(c, deptId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if len(userIds) == 0 {
		common.ApiSuccess(c, gin.H{
			"logs":  []*model.Log{},
			"total": 0,
		})
		return
	}

	logs, total, err := model.GetUsersRecentLogsPaged(userIds, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	enrichLogsWithLdapId(logs)

	common.ApiSuccess(c, gin.H{
		"logs":  logs,
		"total": total,
	})
}

func GetDepartmentUserStats(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid user id"))
		return
	}

	startTimeStr := c.DefaultQuery("start_time", "0")
	endTimeStr := c.DefaultQuery("end_time", "0")
	startTime, _ := strconv.ParseInt(startTimeStr, 10, 64)
	endTime, _ := strconv.ParseInt(endTimeStr, 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("log_page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("log_page_size", "10"))

	overview, err := model.GetUserStatsOverview(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	modelDist, err := model.GetUserModelDistribution(userId)
	if err != nil {
		modelDist = []model.UserModelDistribution{}
	}

	tokenDist, err := model.GetUserTokenDistribution(userId)
	if err != nil {
		tokenDist = []model.UserTokenDistribution{}
	}

	var trendData []*model.QuotaData
	if startTime > 0 && endTime > 0 {
		trendData, err = model.GetQuotaDataByUserId(userId, startTime, endTime)
		if err != nil {
			trendData = []*model.QuotaData{}
		}
	}

	recentLogs, logsTotal, err := model.GetUserRecentLogsPaged(userId, page, pageSize)
	if err != nil {
		recentLogs = []*model.Log{}
		logsTotal = 0
	}

	common.ApiSuccess(c, gin.H{
		"overview": gin.H{
			"total_quota":       overview.TotalQuota,
			"total_prompt":      overview.TotalPrompt,
			"total_completion":  overview.TotalCompletion,
			"total_requests":    overview.TotalRequests,
			"avg_response_time": overview.AvgResponseTime,
			"error_count":       overview.ErrorCount,
			"consume_count":     overview.ConsumeCount,
		},
		"model_distribution": modelDist,
		"token_distribution": tokenDist,
		"trend_data":         trendData,
		"recent_logs":        recentLogs,
		"logs_total":         logsTotal,
	})
}
