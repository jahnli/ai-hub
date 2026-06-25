package service

import (
	"fmt"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

// ── Feishu tenant_access_token cache ──────────────────────────────

var (
	tokenMu     sync.RWMutex
	cachedToken string
	tokenExpiry time.Time
)

// feishuGetCachedTenantAccessToken returns a cached token or refreshes it.
// The token is considered expired 60 seconds before the Feishu-reported expiry.
func feishuGetCachedTenantAccessToken() (string, error) {
	tokenMu.RLock()
	if cachedToken != "" && time.Now().Before(tokenExpiry) {
		t := cachedToken
		tokenMu.RUnlock()
		return t, nil
	}
	tokenMu.RUnlock()

	tokenMu.Lock()
	defer tokenMu.Unlock()

	// double-check after acquiring write lock
	if cachedToken != "" && time.Now().Before(tokenExpiry) {
		return cachedToken, nil
	}

	body := map[string]string{
		"app_id":     system_setting.FeishuAppID(),
		"app_secret": system_setting.FeishuAppSecret(),
	}
	respBody, _, err := feishuDoRequest(http.MethodPost, feishuBaseURL+"/auth/v3/tenant_access_token/internal", body, "")
	if err != nil {
		return "", fmt.Errorf("request tenant_access_token: %w", err)
	}
	var resp struct {
		Code              int    `json:"code"`
		Msg               string `json:"msg"`
		TenantAccessToken string `json:"tenant_access_token"`
		Expire            int    `json:"expire"` // seconds
	}
	if err := common.Unmarshal(respBody, &resp); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
	}
	if resp.Code != 0 {
		return "", fmt.Errorf("feishu code=%d msg=%s", resp.Code, resp.Msg)
	}
	if resp.TenantAccessToken == "" {
		return "", fmt.Errorf("empty tenant_access_token")
	}

	cachedToken = resp.TenantAccessToken
	tokenExpiry = time.Now().Add(time.Duration(resp.Expire)*time.Second - 60*time.Second)
	return cachedToken, nil
}

// ── Feishu department list cache ──────────────────────────────────

const departmentCacheTTL = 5 * time.Minute

type feishuDeptItem struct {
	OpenDepartmentID       string `json:"open_department_id"`
	DepartmentID           string `json:"department_id"`
	Name                   string `json:"name"`
	I18nName               any    `json:"i18n_name"`
	ParentDepartmentID     string `json:"parent_department_id"`
	LeaderUserID           string `json:"leader_user_id"`
	MemberCount            int    `json:"member_count"`
	DirectMemberCount      int    `json:"direct_member_count"`
	ChatID                 string `json:"chat_id"`
	Status                 any    `json:"status"`
	UnitIDs                any    `json:"unit_ids"`
	DepartmentHrbps        any    `json:"department_hrbps"`
	PrimaryMemberCount     int    `json:"primary_member_count"`
	TripartiteMemberCount  int    `json:"tripartite_member_count"`
	DepartmentGroupLeaders any    `json:"department_group_leaders"`
}

type feishuTenantInfo struct {
	Name      string `json:"name"`
	TenantKey string `json:"tenant_key"`
}

var (
	deptCacheMu  sync.RWMutex
	deptCache    []feishuDeptItem
	deptCacheAt  time.Time
	tenantCache  *feishuTenantInfo
	tenantCached bool
)

func getCachedDepartments(token string) ([]feishuDeptItem, error) {
	deptCacheMu.RLock()
	if deptCache != nil && time.Since(deptCacheAt) < departmentCacheTTL {
		result := make([]feishuDeptItem, len(deptCache))
		copy(result, deptCache)
		deptCacheMu.RUnlock()
		return result, nil
	}
	deptCacheMu.RUnlock()

	deptCacheMu.Lock()
	defer deptCacheMu.Unlock()

	// double-check
	if deptCache != nil && time.Since(deptCacheAt) < departmentCacheTTL {
		result := make([]feishuDeptItem, len(deptCache))
		copy(result, deptCache)
		return result, nil
	}

	items, err := feishuFetchAllDepartments(token)
	if err != nil {
		return nil, err
	}

	deptCache = items
	deptCacheAt = time.Now()
	return items, nil
}

func getCachedTenantInfo(token string) (*feishuTenantInfo, error) {
	deptCacheMu.RLock()
	if tenantCached {
		info := tenantCache
		deptCacheMu.RUnlock()
		return info, nil
	}
	deptCacheMu.RUnlock()

	deptCacheMu.Lock()
	defer deptCacheMu.Unlock()

	if tenantCached {
		return tenantCache, nil
	}

	info, err := feishuFetchTenantInfo(token)
	if err != nil {
		return nil, err
	}

	tenantCache = info
	tenantCached = true
	return info, nil
}

// ── Feishu API calls ──────────────────────────────────────────────

const feishuMaxRetries = 2

func feishuFetchAllDepartments(token string) ([]feishuDeptItem, error) {
	var allItems []feishuDeptItem
	pageToken := ""

	for {
		url := feishuBaseURL + "/contact/v3/departments/0/children?" +
			"department_id_type=open_department_id" +
			"&fetch_child=true" +
			"&user_id_type=open_id" +
			"&page_size=50"
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}

		respBody, err := feishuRequestWithRetry(http.MethodGet, url, nil, token)
		if err != nil {
			return nil, fmt.Errorf("fetch departments: %w", err)
		}

		var result feishuAPIResult
		if err := common.Unmarshal(respBody, &result); err != nil {
			return nil, fmt.Errorf("decode department response: %w", err)
		}
		if result.Code != 0 {
			return nil, fmt.Errorf("feishu code=%d msg=%s", result.Code, result.Msg)
		}

		var page struct {
			HasMore   bool             `json:"has_more"`
			PageToken string           `json:"page_token"`
			Items     []feishuDeptItem `json:"items"`
		}
		if err := common.Unmarshal(result.Data, &page); err != nil {
			return nil, fmt.Errorf("decode department data: %w", err)
		}

		allItems = append(allItems, page.Items...)

		if !page.HasMore {
			break
		}
		pageToken = page.PageToken
	}

	return allItems, nil
}

func feishuFetchTenantInfo(token string) (*feishuTenantInfo, error) {
	url := feishuBaseURL + "/tenant/v2/tenant/query"
	respBody, err := feishuRequestWithRetry(http.MethodGet, url, nil, token)
	if err != nil {
		return nil, fmt.Errorf("fetch tenant info: %w", err)
	}
	var result feishuAPIResult
	if err := common.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode tenant response: %w", err)
	}
	if result.Code != 0 {
		return nil, fmt.Errorf("feishu code=%d msg=%s", result.Code, result.Msg)
	}
	var data struct {
		Tenant struct {
			Name      string `json:"name"`
			TenantKey string `json:"tenant_key"`
		} `json:"tenant"`
	}
	if err := common.Unmarshal(result.Data, &data); err != nil {
		return nil, fmt.Errorf("decode tenant data: %w", err)
	}
	return &feishuTenantInfo{
		Name:      data.Tenant.Name,
		TenantKey: data.Tenant.TenantKey,
	}, nil
}

func feishuRequestWithRetry(method, url string, body any, token string) ([]byte, error) {
	var lastErr error
	for attempt := 0; attempt <= feishuMaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
		respBody, status, err := feishuDoRequest(method, url, body, token)
		if err != nil {
			lastErr = err
			continue
		}
		if status == 429 || status >= 500 {
			lastErr = fmt.Errorf("http %d: %s", status, string(respBody))
			continue
		}
		if status < 200 || status >= 300 {
			return nil, fmt.Errorf("http %d: %s", status, string(respBody))
		}
		return respBody, nil
	}
	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// ── Tree building ─────────────────────────────────────────────────

// DeptTreeNode is the frontend-ready tree node.
type DeptTreeNode struct {
	Value        string          `json:"value"`
	Label        string          `json:"label"`
	Disabled     bool            `json:"disabled"`
	LeaderUserID string          `json:"-"`
	Children     []*DeptTreeNode `json:"children"`
}

func buildDeptTree(items []feishuDeptItem) []*DeptTreeNode {
	nodeMap := make(map[string]*DeptTreeNode, len(items))
	childrenMap := make(map[string][]string, len(items))

	for _, item := range items {
		nodeMap[item.OpenDepartmentID] = &DeptTreeNode{
			Value:        item.OpenDepartmentID,
			Label:        item.Name,
			LeaderUserID: item.LeaderUserID,
			Children:     []*DeptTreeNode{},
		}
		childrenMap[item.ParentDepartmentID] = append(childrenMap[item.ParentDepartmentID], item.OpenDepartmentID)
	}

	var roots []*DeptTreeNode
	for _, item := range items {
		node := nodeMap[item.OpenDepartmentID]
		if childIDs, ok := childrenMap[item.OpenDepartmentID]; ok {
			for _, childID := range childIDs {
				if childNode, exists := nodeMap[childID]; exists {
					node.Children = append(node.Children, childNode)
				}
			}
		}
		// root departments: parent is "0" or parent not in our list
		if item.ParentDepartmentID == "0" || item.ParentDepartmentID == "" {
			roots = append(roots, node)
		} else if _, exists := nodeMap[item.ParentDepartmentID]; !exists {
			roots = append(roots, node)
		}
	}

	sortTree(roots)
	return roots
}

func sortTree(nodes []*DeptTreeNode) {
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].Label < nodes[j].Label
	})
	for _, node := range nodes {
		if len(node.Children) > 0 {
			sortTree(node.Children)
		}
	}
}

// ── Permission trimming ───────────────────────────────────────────

// trimTreeForUser returns the permission-trimmed tree and the list of department IDs the user leads.
func trimTreeForUser(fullTree []*DeptTreeNode, userRole int, userOpenID string) ([]*DeptTreeNode, []string) {
	// Super admin: full tree, no disabled
	if userRole >= common.RoleRootUser {
		return fullTree, collectAllLeaderDepts(fullTree, userOpenID)
	}

	// Admin: find departments where user is leader
	leaderDeptIDs := collectAllLeaderDepts(fullTree, userOpenID)
	if len(leaderDeptIDs) == 0 {
		// Admin but not a leader of any department → return full tree with all disabled
		return markAllDisabled(fullTree), nil
	}

	leaderSet := make(map[string]bool, len(leaderDeptIDs))
	for _, id := range leaderDeptIDs {
		leaderSet[id] = true
	}

	// Build a trimmed tree: include leader departments + their subtrees (enabled),
	// plus ancestor path nodes (disabled, for context)
	trimmed := trimNodes(fullTree, leaderSet)
	return trimmed, leaderDeptIDs
}

func collectAllLeaderDepts(nodes []*DeptTreeNode, userOpenID string) []string {
	if userOpenID == "" {
		return nil
	}
	var result []string
	var walk func([]*DeptTreeNode)
	walk = func(nodes []*DeptTreeNode) {
		for _, node := range nodes {
			if node.LeaderUserID == userOpenID {
				result = append(result, node.Value)
			}
			walk(node.Children)
		}
	}
	walk(nodes)
	return result
}

func markAllDisabled(nodes []*DeptTreeNode) []*DeptTreeNode {
	result := make([]*DeptTreeNode, len(nodes))
	for i, node := range nodes {
		cloned := *node
		cloned.Disabled = true
		cloned.Children = markAllDisabled(node.Children)
		result[i] = &cloned
	}
	return result
}

// trimNodes returns a tree containing only:
// 1. Nodes where the user is leader → entire subtree enabled
// 2. Ancestor nodes of such nodes → disabled (for path context)
// Branches with no leader nodes are pruned entirely.
func trimNodes(nodes []*DeptTreeNode, leaderSet map[string]bool) []*DeptTreeNode {
	var result []*DeptTreeNode

	for _, node := range nodes {
		if leaderSet[node.Value] {
			// This node and its entire subtree are accessible
			cloned := *node
			cloned.Disabled = false
			cloned.Children = enableSubtree(node.Children)
			result = append(result, &cloned)
		} else {
			// Check if any descendant is a leader node
			trimmedChildren := trimNodes(node.Children, leaderSet)
			if len(trimmedChildren) > 0 {
				cloned := *node
				cloned.Disabled = true
				cloned.Children = trimmedChildren
				result = append(result, &cloned)
			}
		}
	}

	return result
}

func enableSubtree(nodes []*DeptTreeNode) []*DeptTreeNode {
	result := make([]*DeptTreeNode, len(nodes))
	for i, node := range nodes {
		cloned := *node
		cloned.Disabled = false
		cloned.Children = enableSubtree(node.Children)
		result[i] = &cloned
	}
	return result
}

// ── Public API ────────────────────────────────────────────────────

// DepartmentTreeResponse is the API response structure.
type DepartmentTreeResponse struct {
	TreeData      []*DeptTreeNode `json:"tree_data"`
	LeaderDeptIDs []string        `json:"leader_dept_ids"`
	TenantInfo    *feishuTenantInfo `json:"tenant_info"`
}

// GetDepartmentTree fetches the department tree, caches raw data, and trims by user permissions.
func GetDepartmentTree(userID int, userRole int) (*DepartmentTreeResponse, error) {
	if !system_setting.FeishuEnabled() {
		return nil, fmt.Errorf("feishu integration is not configured")
	}

	token, err := feishuGetCachedTenantAccessToken()
	if err != nil {
		return nil, fmt.Errorf("get tenant_access_token: %w", err)
	}

	items, err := getCachedDepartments(token)
	if err != nil {
		return nil, fmt.Errorf("get departments: %w", err)
	}

	tenantInfo, err := getCachedTenantInfo(token)
	if err != nil {
		common.SysError(fmt.Sprintf("获取租户信息失败: %s", err.Error()))
		tenantInfo = &feishuTenantInfo{Name: "", TenantKey: ""}
	}

	user, err := model.GetUserById(userID, false)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	fullTree := buildDeptTree(items)
	trimmedTree, leaderDeptIDs := trimTreeForUser(fullTree, userRole, user.OpenId)

	// Wrap with tenant root node so the entire company is selectable
	if tenantInfo.Name != "" {
		tenantRoot := &DeptTreeNode{
			Value:    "__tenant__",
			Label:    tenantInfo.Name,
			Children: trimmedTree,
		}
		trimmedTree = []*DeptTreeNode{tenantRoot}
	}

	return &DepartmentTreeResponse{
		TreeData:      trimmedTree,
		LeaderDeptIDs: leaderDeptIDs,
		TenantInfo:    tenantInfo,
	}, nil
}

// DepartmentStatsRequest is the request body for department stats.
type DepartmentStatsRequest struct {
	DepartmentID   string `json:"department_id"`
	StartTimestamp int64  `json:"start_timestamp"`
	EndTimestamp   int64  `json:"end_timestamp"`
}

// GetDepartmentStats fetches stats for users belonging to a department (and its sub-departments).
func GetDepartmentStats(req *DepartmentStatsRequest) (*model.DepartmentStat, error) {
	if !system_setting.FeishuEnabled() {
		return nil, fmt.Errorf("feishu integration is not configured")
	}

	token, err := feishuGetCachedTenantAccessToken()
	if err != nil {
		return nil, fmt.Errorf("get tenant_access_token: %w", err)
	}

	items, err := getCachedDepartments(token)
	if err != nil {
		return nil, fmt.Errorf("get departments: %w", err)
	}

	// Collect all department_ids under the selected node (inclusive)
	deptIDs := collectDeptIDsUnder(items, req.DepartmentID)
	if len(deptIDs) == 0 {
		return &model.DepartmentStat{}, nil
	}

	// Find usernames whose departments JSON contains any of these department_ids
	usernames, err := findUsernamesByDeptIDs(deptIDs)
	if err != nil {
		return nil, fmt.Errorf("find users: %w", err)
	}
	if len(usernames) == 0 {
		return &model.DepartmentStat{}, nil
	}

	return model.GetDepartmentStats(usernames, req.StartTimestamp, req.EndTimestamp)
}

// collectDeptIDsUnder returns the department_id values for a given open_department_id
// and all its descendants. If deptOpenID is "__tenant__", returns all department_ids.
func collectDeptIDsUnder(items []feishuDeptItem, deptOpenID string) []string {
	if deptOpenID == "__tenant__" {
		ids := make([]string, 0, len(items))
		for _, item := range items {
			ids = append(ids, item.DepartmentID)
		}
		return ids
	}

	// Build parent→children map using open_department_id
	childrenMap := make(map[string][]string, len(items))
	openToInternal := make(map[string]string, len(items))
	for _, item := range items {
		childrenMap[item.ParentDepartmentID] = append(childrenMap[item.ParentDepartmentID], item.OpenDepartmentID)
		openToInternal[item.OpenDepartmentID] = item.DepartmentID
	}

	// BFS to collect all descendant open_department_ids
	var result []string
	queue := []string{deptOpenID}
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		if id, ok := openToInternal[curr]; ok {
			result = append(result, id)
		}
		if children, ok := childrenMap[curr]; ok {
			queue = append(queue, children...)
		}
	}

	return result
}

// findUsernamesByDeptIDs queries users whose departments JSON contains any of the given department_ids.
func findUsernamesByDeptIDs(deptIDs []string) ([]string, error) {
	if len(deptIDs) == 0 {
		return nil, nil
	}

	// The `departments` column stores JSON like: [{"department_id":"xxx",...}, ...]
	// Use LIKE-based matching for cross-database compatibility.
	tx := model.DB.Model(&model.User{}).Select("username").Where("username != ''")

	if len(deptIDs) == 1 {
		tx = tx.Where("departments LIKE ?", "%"+deptIDs[0]+"%")
	} else {
		conditions := make([]string, 0, len(deptIDs))
		args := make([]any, 0, len(deptIDs))
		for _, id := range deptIDs {
			conditions = append(conditions, "departments LIKE ?")
			args = append(args, "%"+id+"%")
		}
		tx = tx.Where("("+joinOr(conditions)+")", args...)
	}

	var usernames []string
	if err := tx.Scan(&usernames).Error; err != nil {
		return nil, err
	}
	return usernames, nil
}

func joinOr(conditions []string) string {
	result := ""
	for i, c := range conditions {
		if i > 0 {
			result += " OR "
		}
		result += c
	}
	return result
}
