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

	"golang.org/x/sync/singleflight"
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
// It uses the Feishu Users API to get the real-time member list of each department,
// then matches open_id against the user table to find registered usernames,
// and finally aggregates logs for those usernames.
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

	openDeptIDs := collectOpenDeptIDsUnder(items, req.DepartmentID)
	if len(openDeptIDs) == 0 {
		return &model.DepartmentStat{}, nil
	}

	memberOpenIDs, err := getAllMembersUnderDepts(token, openDeptIDs)
	if err != nil {
		return nil, fmt.Errorf("get department members: %w", err)
	}

	userIds, err := findUserIdsByOpenIDs(memberOpenIDs)
	if err != nil {
		return nil, fmt.Errorf("find users by open_id: %w", err)
	}

	stat, err := model.GetDepartmentStats(userIds, req.StartTimestamp, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	stat.RegisteredUsers = int64(len(userIds))
	stat.UnregisteredUsers = int64(len(memberOpenIDs)) - stat.RegisteredUsers
	return stat, nil
}



// SubDepartmentStatItem holds stats for one sub-department.
type SubDepartmentStatItem struct {
	DepartmentID    string `json:"department_id"`
	DepartmentName  string `json:"department_name"`
	RegisteredUsers int64  `json:"registered_users"`
	TotalUsers      int64  `json:"total_users"`
	TotalQuota      int64  `json:"total_quota"`
	TotalTokens     int64  `json:"total_tokens"`
	TotalRequests   int64  `json:"total_requests"`
}

// GetSubDepartmentStats returns per-child-department statistics for the given parent department.
func GetSubDepartmentStats(req *DepartmentStatsRequest) ([]SubDepartmentStatItem, error) {
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

	children := getDirectChildren(items, req.DepartmentID)
	if len(children) == 0 {
		return []SubDepartmentStatItem{}, nil
	}

	// Collect all members per child department (including sub-descendants)
	type deptMembers struct {
		memberOpenIDs []string
		userIDs       []int
	}
	deptData := make([]deptMembers, len(children))
	errs := make([]error, len(children))
	var wg sync.WaitGroup

	for i, child := range children {
		wg.Add(1)
		go func(idx int, child feishuDeptItem) {
			defer wg.Done()
			deptIDs := collectOpenDeptIDsUnder(items, child.OpenDepartmentID)
			memberOpenIDs, err := getAllMembersUnderDepts(token, deptIDs)
			if err != nil {
				errs[idx] = err
				return
			}
			userIDs, err := findUserIdsByOpenIDs(memberOpenIDs)
			if err != nil {
				errs[idx] = err
				return
			}
			deptData[idx] = deptMembers{memberOpenIDs: memberOpenIDs, userIDs: userIDs}
		}(i, child)
	}
	wg.Wait()

	for _, e := range errs {
		if e != nil {
			return nil, e
		}
	}

	// Collect all unique user IDs and map userID → dept index
	allUserIDs := make([]int, 0)
	userToDeptIdx := make(map[int]int)
	for idx, dm := range deptData {
		for _, uid := range dm.userIDs {
			if _, exists := userToDeptIdx[uid]; !exists {
				userToDeptIdx[uid] = idx
				allUserIDs = append(allUserIDs, uid)
			}
		}
	}

	// Batch query all user stats
	rows, err := model.GetUserStatsBatch(allUserIDs, req.StartTimestamp, req.EndTimestamp)
	if err != nil {
		return nil, fmt.Errorf("get user stats batch: %w", err)
	}

	// Aggregate per department
	type aggResult struct {
		totalTokens   int64
		totalQuota    int64
		totalRequests int64
	}
	agg := make([]aggResult, len(children))
	for _, row := range rows {
		idx, ok := userToDeptIdx[row.UserID]
		if !ok {
			continue
		}
		agg[idx].totalTokens += row.TotalTokens
		agg[idx].totalQuota += row.TotalQuota
		agg[idx].totalRequests += row.TotalReqs
	}

	results := make([]SubDepartmentStatItem, len(children))
	for i, child := range children {
		results[i] = SubDepartmentStatItem{
			DepartmentID:    child.OpenDepartmentID,
			DepartmentName:  child.Name,
			RegisteredUsers: int64(len(deptData[i].userIDs)),
			TotalUsers:      int64(len(deptData[i].memberOpenIDs)),
			TotalQuota:      agg[i].totalQuota,
			TotalTokens:     agg[i].totalTokens,
			TotalRequests:   agg[i].totalRequests,
		}
	}

	return results, nil
}

// getDirectChildren returns the immediate child departments of the given parent.
func getDirectChildren(items []feishuDeptItem, parentOpenDeptID string) []feishuDeptItem {
	if parentOpenDeptID == "__tenant__" {
		knownIDs := make(map[string]bool, len(items))
		for _, item := range items {
			knownIDs[item.OpenDepartmentID] = true
		}
		var roots []feishuDeptItem
		for _, item := range items {
			if item.ParentDepartmentID == "0" || item.ParentDepartmentID == "" || !knownIDs[item.ParentDepartmentID] {
				roots = append(roots, item)
			}
		}
		return roots
	}
	var children []feishuDeptItem
	for _, item := range items {
		if item.ParentDepartmentID == parentOpenDeptID {
			children = append(children, item)
		}
	}
	return children
}

// collectOpenDeptIDsUnder returns the open_department_id values for a given open_department_id
// and all its descendants. If deptOpenID is "__tenant__", returns all open_department_ids.
func collectOpenDeptIDsUnder(items []feishuDeptItem, deptOpenID string) []string {
	if deptOpenID == "__tenant__" {
		ids := make([]string, 0, len(items))
		for _, item := range items {
			ids = append(ids, item.OpenDepartmentID)
		}
		return ids
	}

	childrenMap := make(map[string][]string, len(items))
	knownIDs := make(map[string]bool, len(items))
	for _, item := range items {
		childrenMap[item.ParentDepartmentID] = append(childrenMap[item.ParentDepartmentID], item.OpenDepartmentID)
		knownIDs[item.OpenDepartmentID] = true
	}

	var result []string
	queue := []string{deptOpenID}
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		if knownIDs[curr] {
			result = append(result, curr)
		}
		queue = append(queue, childrenMap[curr]...)
	}
	return result
}

// deptMembersCacheEntry holds cached open_id list for one department.
type deptMembersCacheEntry struct {
	openIDs  []string
	cachedAt time.Time
}

var deptMembersCache sync.Map

// deptMembersSF suppresses duplicate concurrent fetches for the same department.
var deptMembersSF singleflight.Group

func getCachedDepartmentMembers(token, openDeptID string) ([]string, error) {
	if v, ok := deptMembersCache.Load(openDeptID); ok {
		entry := v.(deptMembersCacheEntry)
		if time.Since(entry.cachedAt) < departmentCacheTTL {
			return entry.openIDs, nil
		}
	}
	// singleflight: 相同 deptID 的并发请求只发一次飞书 API，防止缓存击穿
	v, err, _ := deptMembersSF.Do(openDeptID, func() (any, error) {
		return fetchDepartmentMembers(token, openDeptID)
	})
	if err != nil {
		return nil, err
	}
	openIDs := v.([]string)
	deptMembersCache.Store(openDeptID, deptMembersCacheEntry{openIDs: openIDs, cachedAt: time.Now()})
	return openIDs, nil
}

func fetchDepartmentMembers(token, openDeptID string) ([]string, error) {
	var allOpenIDs []string
	pageToken := ""
	for {
		url := feishuBaseURL + "/contact/v3/users?department_id=" + openDeptID +
			"&user_id_type=open_id&department_id_type=open_department_id&page_size=50"
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}
		respBody, err := feishuRequestWithRetry(http.MethodGet, url, nil, token)
		if err != nil {
			return nil, fmt.Errorf("fetch department members: %w", err)
		}
		var result feishuAPIResult
		if err := common.Unmarshal(respBody, &result); err != nil {
			return nil, fmt.Errorf("decode members response: %w", err)
		}
		if result.Code != 0 {
			return nil, fmt.Errorf("feishu code=%d msg=%s", result.Code, result.Msg)
		}
		var page struct {
			HasMore   bool   `json:"has_more"`
			PageToken string `json:"page_token"`
			Items     []struct {
				OpenID string `json:"open_id"`
			} `json:"items"`
		}
		if err := common.Unmarshal(result.Data, &page); err != nil {
			return nil, fmt.Errorf("decode members data: %w", err)
		}
		for _, item := range page.Items {
			if item.OpenID != "" {
				allOpenIDs = append(allOpenIDs, item.OpenID)
			}
		}
		if !page.HasMore {
			break
		}
		pageToken = page.PageToken
	}
	return allOpenIDs, nil
}

// deptMembersFetchConcurrency limits how many departments are fetched
// from the Feishu API in parallel.
const deptMembersFetchConcurrency = 5

func getAllMembersUnderDepts(token string, openDeptIDs []string) ([]string, error) {
	seen := make(map[string]bool)
	var result []string
	var mu sync.Mutex
	var firstErr error
	var errOnce sync.Once

	sem := make(chan struct{}, deptMembersFetchConcurrency)
	var wg sync.WaitGroup

	for _, deptID := range openDeptIDs {
		wg.Add(1)
		go func(deptID string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			// singleflight in getCachedDepartmentMembers ensures concurrent
			// calls for the same deptID share one Feishu API fetch
			members, err := getCachedDepartmentMembers(token, deptID)
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}

			mu.Lock()
			for _, openID := range members {
				if !seen[openID] {
					seen[openID] = true
					result = append(result, openID)
				}
			}
			mu.Unlock()
		}(deptID)
	}
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}
	return result, nil
}

func findUserIdsByOpenIDs(openIDs []string) ([]int, error) {
	if len(openIDs) == 0 {
		return nil, nil
	}
	var userIds []int
	if err := model.DB.Model(&model.User{}).
		Select("id").
		Where("open_id IN ?", openIDs).
		Scan(&userIds).Error; err != nil {
		return nil, err
	}
	return userIds, nil
}

// UsageAnalysisResponse holds all usage analysis data returned in one response.
type UsageAnalysisResponse struct {
	ModelStats []model.ModelStatRow `json:"model_stats"`
	DailyStats []model.DailyStatRow `json:"daily_stats"`
}

// GetUsageAnalysis fetches model ranking and daily trend for the selected department.
func GetUsageAnalysis(req *DepartmentStatsRequest) (*UsageAnalysisResponse, error) {
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

	openDeptIDs := collectOpenDeptIDsUnder(items, req.DepartmentID)
	if len(openDeptIDs) == 0 {
		return &UsageAnalysisResponse{}, nil
	}

	memberOpenIDs, err := getAllMembersUnderDepts(token, openDeptIDs)
	if err != nil {
		return nil, fmt.Errorf("get department members: %w", err)
	}

	userIds, err := findUserIdsByOpenIDs(memberOpenIDs)
	if err != nil {
		return nil, fmt.Errorf("find users by open_id: %w", err)
	}

	if len(userIds) == 0 {
		return &UsageAnalysisResponse{}, nil
	}

	var (
		modelStats []model.ModelStatRow
		dailyStats []model.DailyStatRow
		modelErr   error
		dailyErr   error
		wg         sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		modelStats, modelErr = model.GetModelStats(userIds, req.StartTimestamp, req.EndTimestamp, 10)
	}()
	go func() {
		defer wg.Done()
		dailyStats, dailyErr = model.GetDailyStats(userIds, req.StartTimestamp, req.EndTimestamp)
	}()
	wg.Wait()

	if modelErr != nil {
		return nil, modelErr
	}
	if dailyErr != nil {
		return nil, dailyErr
	}

	return &UsageAnalysisResponse{
		ModelStats: modelStats,
		DailyStats: dailyStats,
	}, nil
}
