package controller

import (
	"encoding/json"
	"net/http"
	"strings"

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
	FeishuName   string `json:"feishu_name"`
	FeishuEmail  string `json:"feishu_email"`
	FeishuUserId string `json:"feishu_user_id"`
	Registered   bool   `json:"registered"`
	Id           int    `json:"id,omitempty"`
	Username     string `json:"username,omitempty"`
	DisplayName  string `json:"display_name,omitempty"`
	Group        string `json:"group,omitempty"`
	Quota        int    `json:"quota,omitempty"`
	UsedQuota    int    `json:"used_quota,omitempty"`
	RequestCount int    `json:"request_count,omitempty"`
	Email        string `json:"email,omitempty"`
	Role         int    `json:"role,omitempty"`
	Status       int    `json:"status,omitempty"`
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

	feishuId := user.UserIdStr
	if feishuId == "" {
		if v, ok := c.Get("feishu_user_id"); ok {
			feishuId, _ = v.(string)
		}
	}

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

		feishuId := user.UserIdStr
		if feishuId == "" {
			if v, ok := c.Get("feishu_user_id"); ok {
				feishuId, _ = v.(string)
			}
		}

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

	feishuUserIds := make([]string, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		feishuUserIds = append(feishuUserIds, fu.UserId)
	}

	localUserMap := make(map[string]*model.User)
	if len(feishuUserIds) > 0 {
		var localUsers []model.User
		model.DB.Model(&model.User{}).
			Where("user_id IN ?", feishuUserIds).
			Select("id, username, display_name, `group`, quota, used_quota, request_count, email, role, status, user_id").
			Find(&localUsers)
		for i := range localUsers {
			localUserMap[localUsers[i].UserIdStr] = &localUsers[i]
		}
	}

	result := make([]departmentUserItem, 0, len(feishuUsers))
	for _, fu := range feishuUsers {
		item := departmentUserItem{
			FeishuName:   fu.Name,
			FeishuEmail:  fu.Email,
			FeishuUserId: fu.UserId,
		}
		if lu, ok := localUserMap[fu.UserId]; ok {
			item.Registered = true
			item.Id = lu.Id
			item.Username = lu.Username
			item.DisplayName = lu.DisplayName
			item.Group = lu.Group
			item.Quota = lu.Quota
			item.UsedQuota = lu.UsedQuota
			item.RequestCount = lu.RequestCount
			item.Email = lu.Email
			item.Role = lu.Role
			item.Status = lu.Status
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
