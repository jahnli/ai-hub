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
}

type deptPathEntry struct {
	DepartmentPath struct {
		DepartmentIds      []string `json:"department_ids"`
		DepartmentPathName struct {
			Name string `json:"name"`
		} `json:"department_path_name"`
	} `json:"department_path"`
}

// buildFullTree constructs a nested tree from a flat department list,
// mirroring the Node.js script's buildNestedTree logic exactly.
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

// filterTreeForLeader prunes the full tree so that:
//   - Ancestor levels (above the leader dept) show only the single-path chain
//   - The leader dept and everything below it is kept in full
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
				Children: filterTreeForLeader(node.Children, ancestorSet, leaderDeptId),
			}
			result = append(result, pruned)
		}
	}
	return result
}

// collectDescendantIds gathers all department IDs that are descendants of rootId.
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
		"success": true,
		"message": "",
		"data":    filteredTree,
	})
}

// mergeTreeRoots merges two tree slices, combining children of nodes with the same value.
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

		ancestorIds, _, _ := parseUserDeptPath(user.DepartmentPath)
		for _, id := range ancestorIds {
			allowedIds[id] = true
		}

		for _, rootId := range leaderDeptIds {
			collectDescendantIds(rootId, departments, allowedIds)
		}

		if !allowedIds[deptId] {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无权访问该部门",
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

	users := queryUsersByDeptIds(targetDeptIds)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    users,
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

func queryUsersByDeptIds(deptIds []string) []map[string]interface{} {
	var users []model.User
	query := model.DB.Model(&model.User{}).Where("status = ?", 1)

	if len(deptIds) == 1 {
		query = query.Where("department_ids LIKE ?", "%"+deptIds[0]+"%")
	} else if len(deptIds) > 1 {
		conditions := make([]string, 0, len(deptIds))
		args := make([]interface{}, 0, len(deptIds))
		for _, id := range deptIds {
			conditions = append(conditions, "department_ids LIKE ?")
			args = append(args, "%"+id+"%")
		}
		query = query.Where(strings.Join(conditions, " OR "), args...)
	}

	query.Select("id, username, display_name, `group`, quota, used_quota, request_count, email, role, status, department_ids").
		Find(&users)

	result := make([]map[string]interface{}, 0, len(users))
	for _, u := range users {
		result = append(result, map[string]interface{}{
			"id":             u.Id,
			"username":       u.Username,
			"display_name":   u.DisplayName,
			"group":          u.Group,
			"quota":          u.Quota,
			"used_quota":     u.UsedQuota,
			"request_count":  u.RequestCount,
			"email":          u.Email,
			"role":           u.Role,
			"status":         u.Status,
			"department_ids": u.DepartmentIds,
		})
	}
	return result
}
