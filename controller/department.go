package controller

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

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
	DepartmentId   string `json:"department_id"`
	DepartmentPath struct {
		DepartmentIds      []string `json:"department_ids"`
		DepartmentPathName struct {
			Name string `json:"name"`
		} `json:"department_path_name"`
	} `json:"department_path"`
}

type departmentUserItem struct {
	Name                   string `json:"name"`
	OpenId                 string `json:"open_id"`
	Registered             bool   `json:"registered"`
	Id                     int    `json:"id,omitempty"`
	Username               string `json:"username,omitempty"`
	DisplayName            string `json:"display_name,omitempty"`
	RequestCount           int64  `json:"request_count,omitempty"`
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

type departmentAccessScope struct {
	isAdmin        bool
	rootDeptIds    []string
	ancestorSet    map[string]bool
	showAncestors  bool
	allowedDeptIds map[string]bool
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
			result = append(result, cloneCascaderNode(node))
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

func cloneCascaderNode(node *cascaderNode) *cascaderNode {
	if node == nil {
		return nil
	}
	cloned := &cascaderNode{
		Value:    node.Value,
		Label:    node.Label,
		Disabled: node.Disabled,
		Children: make([]*cascaderNode, 0, len(node.Children)),
	}
	for _, child := range node.Children {
		cloned.Children = append(cloned.Children, cloneCascaderNode(child))
	}
	return cloned
}

func findAndCloneSubtree(tree []*cascaderNode, rootDeptId string) *cascaderNode {
	for _, node := range tree {
		if node.Value == rootDeptId {
			return cloneCascaderNode(node)
		}
		if found := findAndCloneSubtree(node.Children, rootDeptId); found != nil {
			return found
		}
	}
	return nil
}

func collectDescendantIds(rootId string, departments []*service.FeishuDepartment, result map[string]bool) {
	result[rootId] = true
	for _, dept := range departments {
		if dept.ParentDepartmentId == rootId && !result[dept.DepartmentId] {
			collectDescendantIds(dept.DepartmentId, departments, result)
		}
	}
}

func bpDeptPathIndex(role int) (int, bool) {
	switch role {
	case common.RoleCenterBPUser:
		return 0, true
	case common.RoleBusinessBPUser:
		return 1, true
	default:
		return 0, false
	}
}

func uniqueAppendDeptId(ids []string, seen map[string]bool, id string) []string {
	if id == "" || seen[id] {
		return ids
	}
	seen[id] = true
	return append(ids, id)
}

func getBPDeptRootIds(rawDeptPath string, role int) ([]string, map[string]bool, error) {
	index, ok := bpDeptPathIndex(role)
	if !ok {
		return nil, nil, nil
	}

	entries, err := parseUserDeptPathEntries(rawDeptPath)
	if err != nil {
		return nil, nil, err
	}

	rootIds := make([]string, 0, len(entries))
	seen := make(map[string]bool)
	ancestorSet := make(map[string]bool)
	for _, entry := range entries {
		ids := entry.DepartmentPath.DepartmentIds
		if len(ids) > index {
			rootIds = uniqueAppendDeptId(rootIds, seen, ids[index])
			for i := 0; i < index; i++ {
				ancestorSet[ids[i]] = true
			}
		}
	}
	return rootIds, ancestorSet, nil
}

func getLeaderDeptIds(feishuOpenId string, departments []*service.FeishuDepartment) []string {
	deptMap := make(map[string]*service.FeishuDepartment, len(departments))
	for _, d := range departments {
		deptMap[d.DepartmentId] = d
	}

	leaderDeptIds := make([]string, 0)
	for _, dept := range departments {
		if dept.LeaderUserId == feishuOpenId {
			leaderDeptIds = append(leaderDeptIds, dept.DepartmentId)
		}
	}

	// Sort by level ascending so the highest-level (shallowest) dept is first,
	// which becomes the default selection on the frontend.
	sort.Slice(leaderDeptIds, func(i, j int) bool {
		return service.CalcDeptLevel(leaderDeptIds[i], deptMap) < service.CalcDeptLevel(leaderDeptIds[j], deptMap)
	})

	return leaderDeptIds
}

func buildDepartmentAccessScope(c *gin.Context, departments []*service.FeishuDepartment) (*departmentAccessScope, error) {
	role := c.GetInt("role")
	if role >= common.RoleAdminUser {
		return &departmentAccessScope{isAdmin: true}, nil
	}

	user, err := model.GetUserById(c.GetInt("id"), false)
	if err != nil || user == nil {
		return nil, fmt.Errorf("用户信息不可用")
	}

	scope := &departmentAccessScope{
		allowedDeptIds: make(map[string]bool),
	}

	if _, ok := bpDeptPathIndex(role); ok {
		var bpAncestorSet map[string]bool
		scope.rootDeptIds, bpAncestorSet, err = getBPDeptRootIds(user.DepartmentPath, role)
		if err != nil {
			return nil, fmt.Errorf("解析用户部门路径失败: %s", err.Error())
		}
		if len(bpAncestorSet) > 0 {
			scope.ancestorSet = bpAncestorSet
			scope.showAncestors = true
		}
	} else {
		scope.rootDeptIds = getLeaderDeptIds(user.OpenId, departments)
		ancestorIds, _, err := parseUserDeptPath(user.DepartmentPath)
		if err != nil {
			return nil, fmt.Errorf("解析用户部门路径失败: %s", err.Error())
		}
		scope.ancestorSet = make(map[string]bool, len(ancestorIds))
		for _, id := range ancestorIds {
			scope.ancestorSet[id] = true
		}
		scope.showAncestors = true
	}

	for _, rootId := range scope.rootDeptIds {
		collectDescendantIds(rootId, departments, scope.allowedDeptIds)
	}

	return scope, nil
}

func (scope *departmentAccessScope) canAccessDept(deptId string) bool {
	if scope == nil {
		return false
	}
	if scope.isAdmin {
		return true
	}
	return scope.allowedDeptIds[deptId]
}

func (scope *departmentAccessScope) filterTree(fullTree []*cascaderNode) []*cascaderNode {
	if scope == nil {
		return []*cascaderNode{}
	}
	if scope.isAdmin {
		return fullTree
	}

	filteredTree := make([]*cascaderNode, 0)
	for _, rootDeptId := range scope.rootDeptIds {
		var pruned []*cascaderNode
		if scope.showAncestors {
			pruned = filterTreeForLeader(fullTree, scope.ancestorSet, rootDeptId)
		} else if subtree := findAndCloneSubtree(fullTree, rootDeptId); subtree != nil {
			pruned = []*cascaderNode{subtree}
		}
		if len(pruned) > 0 {
			filteredTree = mergeTreeRoots(filteredTree, pruned)
		}
	}
	return filteredTree
}

func GetDepartmentTree(c *gin.Context) {
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
	tenantInfo, _ := service.FetchTenantInfo(tenantToken)

	scope, err := buildDepartmentAccessScope(c, departments)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	filteredTree := scope.filterTree(fullTree)

	if filteredTree == nil {
		filteredTree = make([]*cascaderNode, 0)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "",
		"data":            filteredTree,
		"leader_dept_ids": scope.rootDeptIds,
		"tenant_info":     tenantInfo,
		"disable_root":    !scope.isAdmin,
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
			// If the incoming node is enabled, promote the existing node too.
			// This handles the case where the same dept appears as both an
			// ancestor (Disabled: true) and a leader root (Disabled: false).
			if !node.Disabled {
				ex.Disabled = false
			}
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
	registeredFilter := c.Query("registered")
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

	if role < common.RoleAdminUser {
		scope, err := buildDepartmentAccessScope(c, departments)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		if !scope.canAccessDept(deptId) {
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
		var wg sync.WaitGroup
		wg.Add(3)
		go func() {
			defer wg.Done()
			subscriptionSummaries, _ = model.GetActiveSubscriptionQuotaSummaryByUserIds(registeredUserIds)
		}()
		go func() {
			defer wg.Done()
			consumptionSummaries, _ = model.GetUserConsumptionSummaryByIdsWithTimeRange(registeredUserIds, startTime, endTime)
		}()
		go func() {
			defer wg.Done()
			topModels, _ = model.GetTopModelByUserIdsWithTimeRange(registeredUserIds, startTime, endTime)
		}()
		wg.Wait()
	}

	result := make([]departmentUserItem, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		isRegistered := false
		if _, ok := localUserMap[fu.OpenId]; ok {
			isRegistered = true
		}

		if registeredFilter == "true" && !isRegistered {
			continue
		}
		if registeredFilter == "false" && isRegistered {
			continue
		}

		item := departmentUserItem{
			Name:   fu.Name,
			OpenId: fu.OpenId,
		}
		if isRegistered {
			lu := localUserMap[fu.OpenId]
			item.Registered = true
			item.Id = lu.Id
			item.Username = lu.Username
			item.DisplayName = lu.DisplayName
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
				item.RequestCount = c.TotalRequestCount
			}
			if m, ok := topModels[lu.Id]; ok {
				item.TopModel = m
			}
		}
		result = append(result, item)
	}

	// Append locally-assigned users (non-Feishu accounts with department_ids)
	feishuOpenIdSet := make(map[string]bool, len(feishuOpenIds))
	for _, oid := range feishuOpenIds {
		feishuOpenIdSet[oid] = true
	}
	extraLocalUsers := queryLocalUsersByDeptIds(targetDeptIds, feishuOpenIdSet)
	if len(extraLocalUsers) > 0 {
		extraUserIds := make([]int, 0, len(extraLocalUsers))
		for i := range extraLocalUsers {
			extraUserIds = append(extraUserIds, extraLocalUsers[i].Id)
		}

		var extraSubSummaries map[int]model.SubscriptionQuotaSummary
		var extraConsumptionSummaries map[int]model.UserConsumptionSummary
		var extraTopModels map[int]string
		var extraWg sync.WaitGroup
		extraWg.Add(3)
		go func() {
			defer extraWg.Done()
			extraSubSummaries, _ = model.GetActiveSubscriptionQuotaSummaryByUserIds(extraUserIds)
		}()
		go func() {
			defer extraWg.Done()
			extraConsumptionSummaries, _ = model.GetUserConsumptionSummaryByIdsWithTimeRange(extraUserIds, startTime, endTime)
		}()
		go func() {
			defer extraWg.Done()
			extraTopModels, _ = model.GetTopModelByUserIdsWithTimeRange(extraUserIds, startTime, endTime)
		}()
		extraWg.Wait()

		for i := range extraLocalUsers {
			lu := &extraLocalUsers[i]
			if registeredFilter == "true" && lu.Id == 0 {
				continue
			}
			if registeredFilter == "false" && lu.Id != 0 {
				continue
			}

			item := departmentUserItem{
				Name:        lu.Name,
				OpenId:      lu.OpenId,
				Registered:  true,
				Id:          lu.Id,
				Username:    lu.Username,
				DisplayName: lu.DisplayName,
				Email:       lu.Email,
				LastLoginAt: lu.LastLoginAt,
			}
			if !lu.CreatedAt.IsZero() {
				item.CreatedAt = lu.CreatedAt.Format("2006-01-02 15:04:05")
			}
			if item.Name == "" {
				item.Name = lu.DisplayName
			}
			if item.Name == "" {
				item.Name = lu.Username
			}

			if s, ok := extraSubSummaries[lu.Id]; ok {
				item.SubQuotaTotal = s.AmountTotal
				item.SubQuotaUsed = s.AmountUsed
				item.SubscriptionResetCount = s.ResetCount
			}
			if c, ok := extraConsumptionSummaries[lu.Id]; ok {
				item.TotalConsumedQuota = c.TotalQuota
				item.TotalPromptTokens = c.TotalPrompt
				item.TotalCompletionTokens = c.TotalCompletion
				item.RequestCount = c.TotalRequestCount
			}
			if m, ok := extraTopModels[lu.Id]; ok {
				item.TopModel = m
			}
			result = append(result, item)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

// queryLocalUserIdsByDeptIds returns user IDs whose department_ids JSON array
// contains at least one of the given target department IDs.
func queryLocalUserIdsByDeptIds(targetDeptIds []string) []int {
	if len(targetDeptIds) == 0 {
		return nil
	}
	var users []model.User
	model.DB.Model(&model.User{}).
		Select("id, department_ids").
		Where("department_ids != ''").
		Find(&users)

	var result []int
	for _, u := range users {
		if u.DepartmentIds == "" {
			continue
		}
		deptIds, err := parseUserDepartmentIds(u.DepartmentIds)
		if err != nil {
			continue
		}
		for _, dId := range deptIds {
			for _, targetId := range targetDeptIds {
				if dId == targetId {
					result = append(result, u.Id)
					goto nextUser
				}
			}
		}
	nextUser:
	}
	return result
}

// queryLocalUsersByDeptIds returns full User records whose department_ids JSON array
// contains at least one of the given target department IDs, excluding users whose
// open_id is in the excludeOpenIds set (typically Feishu users already covered).
func queryLocalUsersByDeptIds(targetDeptIds []string, excludeOpenIds map[string]bool) []model.User {
	if len(targetDeptIds) == 0 {
		return nil
	}
	var users []model.User
	model.DB.Model(&model.User{}).
		Where("department_ids != ''").
		Find(&users)

	var result []model.User
	for _, u := range users {
		if u.DepartmentIds == "" {
			continue
		}
		if excludeOpenIds != nil && u.OpenId != "" && excludeOpenIds[u.OpenId] {
			continue
		}
		deptIds, err := parseUserDepartmentIds(u.DepartmentIds)
		if err != nil {
			continue
		}
		for _, dId := range deptIds {
			for _, targetId := range targetDeptIds {
				if dId == targetId {
					result = append(result, u)
					goto nextUser2
				}
			}
		}
	nextUser2:
	}
	return result
}

func parseUserDeptPath(raw string) (ids []string, names []string, err error) {
	entries, err := parseUserDeptPathEntries(raw)
	if err != nil || len(entries) == 0 {
		return nil, nil, err
	}

	entry := entries[0]
	ids = entry.DepartmentPath.DepartmentIds
	pathName := entry.DepartmentPath.DepartmentPathName.Name
	if pathName != "" {
		names = strings.Split(pathName, "-")
	}

	return ids, names, nil
}

func parseUserDeptPathEntries(raw string) ([]deptPathEntry, error) {
	if raw == "" {
		return nil, nil
	}

	var entries []deptPathEntry
	if err := common.Unmarshal([]byte(raw), &entries); err != nil {
		return nil, err
	}

	return entries, nil
}

func parseUserDepartmentIds(raw string) ([]string, error) {
	if raw == "" {
		return nil, nil
	}

	var ids []string
	if err := common.Unmarshal([]byte(raw), &ids); err != nil {
		return nil, err
	}
	return ids, nil
}

func userInDepartmentAccessScope(user *model.User, scope *departmentAccessScope) (bool, error) {
	if user == nil || scope == nil {
		return false, nil
	}
	if scope.isAdmin {
		return true, nil
	}

	deptIds, err := parseUserDepartmentIds(user.DepartmentIds)
	if err != nil {
		return false, fmt.Errorf("解析用户部门失败: %s", err.Error())
	}
	for _, deptId := range deptIds {
		if scope.canAccessDept(deptId) {
			return true, nil
		}
	}

	pathEntries, err := parseUserDeptPathEntries(user.DepartmentPath)
	if err != nil {
		return false, fmt.Errorf("解析用户部门路径失败: %s", err.Error())
	}
	for _, entry := range pathEntries {
		if scope.canAccessDept(entry.DepartmentId) {
			return true, nil
		}
		for _, deptId := range entry.DepartmentPath.DepartmentIds {
			if scope.canAccessDept(deptId) {
				return true, nil
			}
		}
	}

	return false, nil
}

func ensureDepartmentUserStatsAccess(c *gin.Context, targetUserId int) error {
	role := c.GetInt("role")
	if role >= common.RoleAdminUser {
		return nil
	}

	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		return fmt.Errorf("获取飞书凭证失败: %s", err.Error())
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		return fmt.Errorf("获取部门列表失败: %s", err.Error())
	}

	scope, err := buildDepartmentAccessScope(c, departments)
	if err != nil {
		return err
	}

	targetUser, err := model.GetUserById(targetUserId, false)
	if err != nil || targetUser == nil {
		return fmt.Errorf("用户信息不可用")
	}

	allowed, err := userInDepartmentAccessScope(targetUser, scope)
	if err != nil {
		return err
	}
	if !allowed {
		return fmt.Errorf("权限不足")
	}

	return nil
}

func getDeptRegisteredUserIds(c *gin.Context, deptId string) ([]int, error) {
	role := c.GetInt("role")

	if deptId == "0" && role >= 10 {
		return nil, nil
	}

	tenantToken, err := service.GetTenantAccessToken()
	if err != nil {
		return nil, fmt.Errorf("获取飞书凭证失败: %s", err.Error())
	}

	departments, err := service.FetchAllDepartments(tenantToken)
	if err != nil {
		return nil, fmt.Errorf("获取部门列表失败: %s", err.Error())
	}

	if role < common.RoleAdminUser {
		scope, err := buildDepartmentAccessScope(c, departments)
		if err != nil {
			return nil, err
		}
		if !scope.canAccessDept(deptId) {
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
	feishuOpenIdSet := make(map[string]bool, len(feishuUsers))
	for _, fu := range feishuUsers {
		feishuOpenIds = append(feishuOpenIds, fu.OpenId)
		feishuOpenIdSet[fu.OpenId] = true
	}

	var userIds []int
	if len(feishuOpenIds) > 0 {
		var localUsers []model.User
		model.DB.Model(&model.User{}).
			Select("id, open_id").
			Where("open_id IN ?", feishuOpenIds).
			Find(&localUsers)

		localUserMap := make(map[string]*model.User, len(localUsers))
		for i := range localUsers {
			localUserMap[localUsers[i].OpenId] = &localUsers[i]
		}
		for _, lu := range localUserMap {
			userIds = append(userIds, lu.Id)
		}
	}

	// Also include local users (non-Feishu accounts) assigned to these departments via department_ids.
	// Keep this in sync with GetDepartmentUsers so overview totals match the visible user list.
	extraUsers := queryLocalUsersByDeptIds(targetDeptIds, feishuOpenIdSet)
	for i := range extraUsers {
		userIds = append(userIds, extraUsers[i].Id)
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

	if userIds != nil && len(userIds) == 0 {
		common.ApiSuccess(c, gin.H{
			"overview":           gin.H{},
			"model_distribution": []model.UserModelDistribution{},
			"trend_data":         []*model.QuotaData{},
			"recent_logs":        []*model.Log{},
		})
		return
	}

	var (
		overview      *model.UserStatsOverview
		overviewErr   error
		tokenCounts   map[int]int64
		tokenCountErr error
		subSummaries  map[int]model.SubscriptionQuotaSummary
		subErr        error
		modelDist     []model.UserModelDistribution
		modelDistErr  error
		trendData     []*model.QuotaData
		trendErr      error
		wg            sync.WaitGroup
	)

	wg.Add(5)
	go func() {
		defer wg.Done()
		overview, overviewErr = model.GetUsersStatsOverviewWithTimeRange(userIds, startTime, endTime)
	}()
	go func() {
		defer wg.Done()
		tokenCounts, tokenCountErr = model.CountTokensByUserIds(userIds)
	}()
	go func() {
		defer wg.Done()
		subSummaries, subErr = model.GetActiveSubscriptionQuotaSummaryByUserIds(userIds)
	}()
	go func() {
		defer wg.Done()
		modelDist, modelDistErr = model.GetUsersModelDistributionWithTimeRange(userIds, startTime, endTime)
	}()
	go func() {
		defer wg.Done()
		if startTime > 0 && endTime > 0 {
			trendData, trendErr = model.GetQuotaDataByUserIds(userIds, startTime, endTime)
		}
	}()
	wg.Wait()

	if overviewErr != nil {
		common.ApiError(c, overviewErr)
		return
	}

	var tokenCount int64
	if tokenCountErr == nil {
		for _, cnt := range tokenCounts {
			tokenCount += cnt
		}
	}

	var subTotal, subUsed int64
	if subErr == nil {
		for _, s := range subSummaries {
			subTotal += s.AmountTotal
			subUsed += s.AmountUsed
		}
	}

	if modelDistErr != nil {
		modelDist = []model.UserModelDistribution{}
	}
	if trendErr != nil {
		trendData = []*model.QuotaData{}
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

	if role < common.RoleAdminUser {
		scope, err := buildDepartmentAccessScope(c, departments)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if !scope.canAccessDept(deptId) {
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
	allFeishuOpenIdSet := make(map[string]bool)
	for _, fu := range allFeishuUsers {
		if fu.OpenId != "" {
			allFeishuOpenIdSet[fu.OpenId] = true
		}
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

	// Also assign locally-assigned users (non-Feishu accounts) to child departments
	extraAllLocalUsers := queryLocalUsersByDeptIds(allDeptIds, allFeishuOpenIdSet)
	childLocalUserIds := make(map[string][]int, len(directChildren))
	childLocalUserIdSets := make(map[string]map[int]bool, len(directChildren))
	for _, lu := range extraAllLocalUsers {
		if lu.DepartmentIds == "" {
			continue
		}
		deptIds, err := parseUserDepartmentIds(lu.DepartmentIds)
		if err != nil {
			continue
		}
		for _, child := range directChildren {
			matched := false
			for _, dId := range deptIds {
				if childDescendants[child.DepartmentId][dId] {
					matched = true
					break
				}
			}
			if matched {
				if childLocalUserIdSets[child.DepartmentId] == nil {
					childLocalUserIdSets[child.DepartmentId] = make(map[int]bool)
				}
				if !childLocalUserIdSets[child.DepartmentId][lu.Id] {
					childLocalUserIdSets[child.DepartmentId][lu.Id] = true
					childLocalUserIds[child.DepartmentId] = append(childLocalUserIds[child.DepartmentId], lu.Id)
				}
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
	}

	results := make([]childStat, 0, len(directChildren))

	allOpenIds := make([]string, 0)
	for _, child := range directChildren {
		allOpenIds = append(allOpenIds, childFeishuUsers[child.DepartmentId]...)
	}

	allLocalUserMap := make(map[string]int)
	if len(allOpenIds) > 0 {
		var localUsers []model.User
		model.DB.Model(&model.User{}).Select("id, open_id").Where("open_id IN ?", allOpenIds).Find(&localUsers)
		for _, lu := range localUsers {
			allLocalUserMap[lu.OpenId] = lu.Id
		}
	}

	type childStatResult struct {
		index int
		stat  childStat
	}

	resultsCh := make(chan childStatResult, len(directChildren))
	var statsWg sync.WaitGroup

	for i, child := range directChildren {
		openIds := childFeishuUsers[child.DepartmentId]
		localIds := childLocalUserIds[child.DepartmentId]
		stat := childStat{
			DeptId:      child.DepartmentId,
			DeptName:    child.GetName(),
			MemberCount: len(openIds) + len(localIds),
		}

		if len(openIds) == 0 && len(localIds) == 0 {
			resultsCh <- childStatResult{index: i, stat: stat}
			continue
		}

		userIds := make([]int, 0)
		userIdSet := make(map[int]bool)
		for _, oid := range openIds {
			if uid, ok := allLocalUserMap[oid]; ok {
				if !userIdSet[uid] {
					userIdSet[uid] = true
					userIds = append(userIds, uid)
				}
			}
		}
		// Add locally-assigned user IDs directly
		for _, uid := range localIds {
			if !userIdSet[uid] {
				userIdSet[uid] = true
				userIds = append(userIds, uid)
			}
		}
		stat.RegisteredCount = len(userIds)

		if len(userIds) == 0 {
			resultsCh <- childStatResult{index: i, stat: stat}
			continue
		}

		statsWg.Add(1)
		go func(idx int, s childStat, uids []int) {
			defer statsWg.Done()
			overview, err := model.GetUsersStatsOverviewWithTimeRange(uids, startTime, endTime)
			if err == nil {
				s.TotalQuota = overview.TotalQuota
				s.TotalPrompt = overview.TotalPrompt
				s.TotalCompletion = overview.TotalCompletion
				s.TotalRequests = overview.TotalRequests
			}
			resultsCh <- childStatResult{index: idx, stat: s}
		}(i, stat, userIds)
	}

	statsWg.Wait()
	close(resultsCh)

	results = make([]childStat, len(directChildren))
	for r := range resultsCh {
		results[r.index] = r.stat
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

	if userIds != nil && len(userIds) == 0 {
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

	if err := ensureDepartmentUserStatsAccess(c, userId); err != nil {
		common.ApiError(c, err)
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
