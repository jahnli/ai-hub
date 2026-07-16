package service

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
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

// departmentMemberCacheTTL is the TTL for per-department member caches (open_id list and details).
// Using a longer TTL (30 min) since member lists rarely change within short intervals.
const departmentMemberCacheTTL = 30 * time.Minute

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

func SendFeishuCardMessage(openID string, cardJSON string) error {
	token, err := feishuGetCachedTenantAccessToken()
	if err != nil {
		return err
	}

	body := map[string]string{
		"receive_id": openID,
		"msg_type":   "interactive",
		"content":    cardJSON,
	}
	respBody, err := feishuRequestWithRetry(http.MethodPost, feishuBaseURL+"/im/v1/messages?receive_id_type=open_id", body, token)
	if err != nil {
		return err
	}

	var result feishuAPIResult
	if err := common.Unmarshal(respBody, &result); err != nil {
		return fmt.Errorf("decode message response: %w", err)
	}
	if result.Code != 0 {
		return fmt.Errorf("feishu code=%d msg=%s", result.Code, result.Msg)
	}
	return nil
}

func BuildViolationNoticeCard(requestTime string, requestID string, modelName string) (string, error) {
	if modelName == "" {
		modelName = "-"
	}

	card := map[string]any{
		"config": map[string]any{
			"wide_screen_mode": true,
		},
		"header": map[string]any{
			"template": "red",
			"title": map[string]string{
				"tag":     "plain_text",
				"content": "安全审计提醒",
			},
		},
		"elements": []map[string]any{
			{
				"tag":     "markdown",
				"content": "你的 API 请求疑似包含非工作或违规内容，请及时调整使用方式。",
			},
			{
				"tag": "div",
				"fields": []map[string]any{
					{
						"is_short": true,
						"text": map[string]string{
							"tag":     "lark_md",
							"content": "**请求时间**\n" + requestTime,
						},
					},
					{
						"is_short": true,
						"text": map[string]string{
							"tag":     "lark_md",
							"content": "**模型**\n" + modelName,
						},
					},
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"tag":     "lark_md",
					"content": "**Request ID**\n" + requestID,
				},
			},
			{
				"tag":     "markdown",
				"content": "如误告警，忽略即可",
			},
		},
	}

	data, err := common.Marshal(card)
	if err != nil {
		return "", err
	}
	return string(data), nil
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

	return roots
}

// ── Permission trimming ───────────────────────────────────────────

// trimTreeForUser returns the permission-trimmed tree and the list of department IDs the user leads.
func trimTreeForUser(fullTree []*DeptTreeNode, userRole int, userOpenID string, departmentName string, leaderDeptIDs []string) ([]*DeptTreeNode, []string) {
	// Super admin: full tree, no disabled
	if userRole >= common.RoleRootUser {
		if len(leaderDeptIDs) == 0 {
			leaderDeptIDs = collectAllLeaderDepts(fullTree, userOpenID)
		}
		return fullTree, leaderDeptIDs
	}

	// Admin: leader-based permission trimming
	if userRole >= common.RoleAdminUser {
		if len(leaderDeptIDs) == 0 {
			leaderDeptIDs = collectAllLeaderDepts(fullTree, userOpenID)
		}
		if len(leaderDeptIDs) == 0 {
			return markAllDisabled(fullTree), nil
		}
		leaderSet := make(map[string]bool, len(leaderDeptIDs))
		for _, id := range leaderDeptIDs {
			leaderSet[id] = true
		}
		trimmed := trimNodes(fullTree, leaderSet)
		return trimmed, leaderDeptIDs
	}

	// BP roles: scope based on user's department_name hierarchy
	if userRole == common.RoleCenterBP || userRole == common.RoleBUBP {
		return trimTreeForBP(fullTree, userRole, departmentName)
	}

	// Dept leader (role=1): sees departments where their OpenId is the leader_id.
	if len(leaderDeptIDs) == 0 {
		leaderDeptIDs = collectAllLeaderDepts(fullTree, userOpenID)
	}
	if len(leaderDeptIDs) > 0 {
		leaderSet := make(map[string]bool, len(leaderDeptIDs))
		for _, id := range leaderDeptIDs {
			leaderSet[id] = true
		}
		trimmed := trimNodes(fullTree, leaderSet)
		return trimmed, leaderDeptIDs
	}

	return markAllDisabled(fullTree), nil
}

// trimTreeForBP trims the tree for BP users based on their department_name hierarchy.
// CenterBP sees the center (1st segment) and all sub-departments.
// BUBP sees the business unit (2nd segment) and all sub-departments.
func trimTreeForBP(fullTree []*DeptTreeNode, userRole int, departmentName string) ([]*DeptTreeNode, []string) {
	segments := splitDepartmentName(departmentName)

	var targetName string
	switch userRole {
	case common.RoleCenterBP:
		if len(segments) < 1 {
			return markAllDisabled(fullTree), nil
		}
		targetName = segments[0]
	case common.RoleBUBP:
		if len(segments) < 2 {
			return markAllDisabled(fullTree), nil
		}
		targetName = segments[1]
	default:
		return markAllDisabled(fullTree), nil
	}

	targetNode := findNodeByLabel(fullTree, targetName)
	if targetNode == nil {
		return markAllDisabled(fullTree), nil
	}

	targetSet := map[string]bool{targetNode.Value: true}
	trimmed := trimNodes(fullTree, targetSet)
	return trimmed, []string{targetNode.Value}
}

// splitDepartmentName splits "数智产品中心 / AI应用技术部 / AI工程效率科" into
// ["数智产品中心", "AI应用技术部", "AI工程效率科"].
func splitDepartmentName(name string) []string {
	if name == "" {
		return nil
	}
	parts := strings.Split(name, " / ")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// findNodeByLabel searches the tree recursively for a node with the given label.
func findNodeByLabel(nodes []*DeptTreeNode, label string) *DeptTreeNode {
	for _, node := range nodes {
		if node.Label == label {
			return node
		}
		if found := findNodeByLabel(node.Children, label); found != nil {
			return found
		}
	}
	return nil
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
	TreeData      []*DeptTreeNode   `json:"tree_data"`
	LeaderDeptIDs []string          `json:"leader_dept_ids"`
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
	trimmedTree, leaderDeptIDs := trimTreeForUser(fullTree, userRole, user.OpenId, user.DepartmentName, user.GetLeaderDepartmentIDs())

	if tenantInfo.Name != "" {
		tenantRoot := &DeptTreeNode{
			Value:    "__tenant__",
			Label:    tenantInfo.Name,
			Disabled: userRole < common.RoleAdminUser,
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

const defaultActiveUserRequestThreshold = 10

func getActiveUserRequestThreshold() int {
	threshold := common.GetEnvOrDefault(
		"DATA_OVERVIEW_ACTIVE_USER_REQUEST_THRESHOLD",
		defaultActiveUserRequestThreshold,
	)
	if threshold < 0 {
		common.SysError("DATA_OVERVIEW_ACTIVE_USER_REQUEST_THRESHOLD must not be negative, using default value: 10")
		return defaultActiveUserRequestThreshold
	}
	return threshold
}

// DepartmentStatsRequest is the request body for department stats.
type DepartmentStatsRequest struct {
	DepartmentID   string `json:"department_id"`
	StartTimestamp int64  `json:"start_timestamp"`
	EndTimestamp   int64  `json:"end_timestamp"`
}

// DepartmentLogsRequest is the request body for department usage logs.
type DepartmentLogsRequest struct {
	DepartmentID      string `json:"department_id"`
	StartTimestamp    int64  `json:"start_timestamp"`
	EndTimestamp      int64  `json:"end_timestamp"`
	Page              int    `json:"p"`
	PageSize          int    `json:"page_size"`
	LogType           int    `json:"type"`
	Username          string `json:"username"`
	TokenName         string `json:"token_name"`
	ModelName         string `json:"model_name"`
	Channel           int    `json:"channel"`
	Group             string `json:"group"`
	RequestID         string `json:"request_id"`
	UpstreamRequestID string `json:"upstream_request_id"`
}

// DepartmentUserLogsRequest is the request body for one user's usage logs.
type DepartmentUserLogsRequest struct {
	UserID         int   `json:"user_id"`
	StartTimestamp int64 `json:"start_timestamp"`
	EndTimestamp   int64 `json:"end_timestamp"`
	Page           int   `json:"p"`
	PageSize       int   `json:"page_size"`
}

// GetDepartmentLogs fetches usage logs for registered users under a department.
func GetDepartmentLogs(req *DepartmentLogsRequest) (*common.PageInfo, error) {
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
	pageInfo := departmentLogsPageInfo(req.Page, req.PageSize)
	if len(openDeptIDs) == 0 {
		pageInfo.SetItems([]*model.Log{})
		return pageInfo, nil
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
		pageInfo.SetItems([]*model.Log{})
		return pageInfo, nil
	}

	logs, total, err := model.GetLogsByUserIds(
		userIds,
		req.LogType,
		req.StartTimestamp,
		req.EndTimestamp,
		req.ModelName,
		req.Username,
		req.TokenName,
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
		req.Channel,
		req.Group,
		req.RequestID,
		req.UpstreamRequestID,
	)
	if err != nil {
		return nil, err
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	return pageInfo, nil
}

// GetDepartmentUserLogs fetches logs by immutable user ID for the user statistics dialog.
func GetDepartmentUserLogs(req *DepartmentUserLogsRequest) (*common.PageInfo, error) {
	pageInfo := departmentLogsPageInfo(req.Page, req.PageSize)
	logs, total, err := model.GetLogsByUserIds(
		[]int{req.UserID},
		model.LogTypeUnknown,
		req.StartTimestamp,
		req.EndTimestamp,
		"",
		"",
		"",
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
		0,
		"",
		"",
		"",
	)
	if err != nil {
		return nil, err
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	return pageInfo, nil
}

func departmentLogsPageInfo(page int, pageSize int) *common.PageInfo {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = common.ItemsPerPage
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return &common.PageInfo{Page: page, PageSize: pageSize}
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

	activeUserRequestThreshold := getActiveUserRequestThreshold()

	stat, err := model.GetDepartmentStats(
		userIds,
		req.StartTimestamp,
		req.EndTimestamp,
		activeUserRequestThreshold,
	)
	if err != nil {
		return nil, err
	}
	stat.RegisteredUsers = int64(len(userIds))
	stat.UnregisteredUsers = int64(len(memberOpenIDs)) - stat.RegisteredUsers

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}
	stat.TotalAmountCNY = float64(stat.TotalQuota) / quotaPerUnit * usdExchangeRate

	if stat.TotalTokens > 0 {
		stat.AvgPricePerMT = stat.TotalAmountCNY / (float64(stat.TotalTokens) / 1000000.0)
	}
	totalUsers := stat.RegisteredUsers + stat.UnregisteredUsers
	if totalUsers > 0 {
		stat.ActiveUserRate = float64(stat.ActiveUsers) / float64(totalUsers) * 100
	}
	if stat.ActiveUsers > 0 {
		stat.AvgTokensPerActiveUserMT = float64(stat.TotalTokens) / float64(stat.ActiveUsers) / 1000000.0
	}

	return stat, nil
}

// SubDepartmentStatItem holds stats for one sub-department.
type SubDepartmentStatItem struct {
	DepartmentID             string  `json:"department_id"`
	DepartmentName           string  `json:"department_name"`
	RegisteredUsers          int64   `json:"registered_users"`
	TotalUsers               int64   `json:"total_users"`
	TotalQuota               int64   `json:"total_quota"`
	TotalAmountCNY           float64 `json:"total_amount_cny"`
	AvgPricePerMT            float64 `json:"avg_price_per_mt"`
	TotalTokens              int64   `json:"total_tokens"`
	TotalRequests            int64   `json:"total_requests"`
	ActiveUsers              int64   `json:"active_users"`
	ActiveUserRate           float64 `json:"active_user_rate"`
	AvgTokensPerActiveUserMT float64 `json:"avg_tokens_per_active_user_mt"`
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
		activeUsers   int64
	}
	agg := make([]aggResult, len(children))
	activeUserRequestThreshold := getActiveUserRequestThreshold()
	for _, row := range rows {
		idx, ok := userToDeptIdx[row.UserID]
		if !ok {
			continue
		}
		agg[idx].totalTokens += row.TotalTokens
		agg[idx].totalQuota += row.TotalQuota
		agg[idx].totalRequests += row.TotalReqs
		if row.TotalReqs > int64(activeUserRequestThreshold) {
			agg[idx].activeUsers++
		}
	}

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}

	results := make([]SubDepartmentStatItem, len(children))
	for i, child := range children {
		totalAmountCNY := float64(agg[i].totalQuota) / quotaPerUnit * usdExchangeRate
		avgPricePerMT := 0.0
		if agg[i].totalTokens > 0 {
			avgPricePerMT = totalAmountCNY / (float64(agg[i].totalTokens) / 1000000.0)
		}
		activeUserRate := 0.0
		if len(deptData[i].memberOpenIDs) > 0 {
			activeUserRate = float64(agg[i].activeUsers) / float64(len(deptData[i].memberOpenIDs)) * 100
		}
		avgTokensPerActiveUserMT := 0.0
		if agg[i].activeUsers > 0 {
			avgTokensPerActiveUserMT = float64(agg[i].totalTokens) / float64(agg[i].activeUsers) / 1000000.0
		}

		results[i] = SubDepartmentStatItem{
			DepartmentID:             child.OpenDepartmentID,
			DepartmentName:           child.Name,
			RegisteredUsers:          int64(len(deptData[i].userIDs)),
			TotalUsers:               int64(len(deptData[i].memberOpenIDs)),
			TotalQuota:               agg[i].totalQuota,
			TotalAmountCNY:           totalAmountCNY,
			AvgPricePerMT:            avgPricePerMT,
			TotalTokens:              agg[i].totalTokens,
			TotalRequests:            agg[i].totalRequests,
			ActiveUsers:              agg[i].activeUsers,
			ActiveUserRate:           activeUserRate,
			AvgTokensPerActiveUserMT: avgTokensPerActiveUserMT,
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

type deptMemberDetailsCacheEntry struct {
	members  []feishuDeptMember
	cachedAt time.Time
}

type feishuDeptMember struct {
	OpenID string `json:"open_id"`
	Name   string `json:"name"`
}

var deptMembersCache sync.Map
var deptMemberDetailsCache sync.Map

// deptMembersSF suppresses duplicate concurrent fetches for the same department.
var deptMembersSF singleflight.Group

func getCachedDepartmentMembers(token, openDeptID string) ([]string, error) {
	if v, ok := deptMembersCache.Load(openDeptID); ok {
		entry := v.(deptMembersCacheEntry)
		if time.Since(entry.cachedAt) < departmentMemberCacheTTL {
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

func getCachedDepartmentMemberDetails(token, openDeptID string) ([]feishuDeptMember, error) {
	if v, ok := deptMemberDetailsCache.Load(openDeptID); ok {
		entry := v.(deptMemberDetailsCacheEntry)
		if time.Since(entry.cachedAt) < departmentMemberCacheTTL {
			return entry.members, nil
		}
	}

	v, err, _ := deptMembersSF.Do(openDeptID+":details", func() (any, error) {
		return fetchDepartmentMemberDetails(token, openDeptID)
	})
	if err != nil {
		return nil, err
	}
	members := v.([]feishuDeptMember)
	deptMemberDetailsCache.Store(openDeptID, deptMemberDetailsCacheEntry{members: members, cachedAt: time.Now()})
	return members, nil
}

func fetchDepartmentMemberDetails(token, openDeptID string) ([]feishuDeptMember, error) {
	var allMembers []feishuDeptMember
	pageToken := ""
	for {
		url := feishuBaseURL + "/contact/v3/users/find_by_department?department_id=" + openDeptID +
			"&user_id_type=open_id&department_id_type=open_department_id&page_size=50"
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}
		respBody, err := feishuRequestWithRetry(http.MethodGet, url, nil, token)
		if err != nil {
			return nil, fmt.Errorf("fetch department member details: %w", err)
		}
		var result feishuAPIResult
		if err := common.Unmarshal(respBody, &result); err != nil {
			return nil, fmt.Errorf("decode member details response: %w", err)
		}
		if result.Code != 0 {
			return nil, fmt.Errorf("feishu code=%d msg=%s", result.Code, result.Msg)
		}
		var page struct {
			HasMore   bool               `json:"has_more"`
			PageToken string             `json:"page_token"`
			Items     []feishuDeptMember `json:"items"`
		}
		if err := common.Unmarshal(result.Data, &page); err != nil {
			return nil, fmt.Errorf("decode member details data: %w", err)
		}
		allMembers = append(allMembers, page.Items...)
		if !page.HasMore {
			break
		}
		pageToken = page.PageToken
	}
	return allMembers, nil
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
	ModelStats      []model.ModelStatRow      `json:"model_stats"`
	DailyStats      []model.DailyStatRow      `json:"daily_stats"`
	ModelDailyStats []model.ModelDailyStatRow `json:"model_daily_stats"`
	QuotaToCNY      float64                   `json:"quota_to_cny"`
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
		modelStats      []model.ModelStatRow
		dailyStats      []model.DailyStatRow
		modelDailyStats []model.ModelDailyStatRow
		modelErr        error
		dailyErr        error
		modelDailyErr   error
		wg              sync.WaitGroup
	)
	wg.Add(3)
	go func() {
		defer wg.Done()
		modelStats, modelErr = model.GetModelStats(userIds, req.StartTimestamp, req.EndTimestamp, 10)
	}()
	go func() {
		defer wg.Done()
		dailyStats, dailyErr = model.GetDailyStats(userIds, req.StartTimestamp, req.EndTimestamp)
	}()
	go func() {
		defer wg.Done()
		modelDailyStats, modelDailyErr = model.GetModelDailyStats(userIds, req.StartTimestamp, req.EndTimestamp, 10)
	}()
	wg.Wait()

	if modelErr != nil {
		return nil, modelErr
	}
	if dailyErr != nil {
		return nil, dailyErr
	}
	if modelDailyErr != nil {
		return nil, modelDailyErr
	}

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}
	quotaToCNY := usdExchangeRate / quotaPerUnit

	return &UsageAnalysisResponse{
		ModelStats:      modelStats,
		DailyStats:      dailyStats,
		ModelDailyStats: modelDailyStats,
		QuotaToCNY:      quotaToCNY,
	}, nil
}

// UserUsageAnalysisRequest holds the request params for single-user usage analysis.
type UserUsageAnalysisRequest struct {
	UserID         int   `json:"user_id"`
	StartTimestamp int64 `json:"start_timestamp"`
	EndTimestamp   int64 `json:"end_timestamp"`
}

// GetUserUsageAnalysis fetches model ranking and daily trend for a single user.
func GetUserUsageAnalysis(req *UserUsageAnalysisRequest) (*UsageAnalysisResponse, error) {
	userIds := []int{req.UserID}

	var (
		modelStats      []model.ModelStatRow
		dailyStats      []model.DailyStatRow
		modelDailyStats []model.ModelDailyStatRow
		modelErr        error
		dailyErr        error
		modelDailyErr   error
		wg              sync.WaitGroup
	)
	wg.Add(3)
	go func() {
		defer wg.Done()
		modelStats, modelErr = model.GetModelStats(userIds, req.StartTimestamp, req.EndTimestamp, 10)
	}()
	go func() {
		defer wg.Done()
		dailyStats, dailyErr = model.GetDailyStats(userIds, req.StartTimestamp, req.EndTimestamp)
	}()
	go func() {
		defer wg.Done()
		modelDailyStats, modelDailyErr = model.GetModelDailyStats(userIds, req.StartTimestamp, req.EndTimestamp, 10)
	}()
	wg.Wait()

	if modelErr != nil {
		return nil, modelErr
	}
	if dailyErr != nil {
		return nil, dailyErr
	}
	if modelDailyErr != nil {
		return nil, modelDailyErr
	}

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}
	quotaToCNY := usdExchangeRate / quotaPerUnit

	return &UsageAnalysisResponse{
		ModelStats:      modelStats,
		DailyStats:      dailyStats,
		ModelDailyStats: modelDailyStats,
		QuotaToCNY:      quotaToCNY,
	}, nil
}

// DepartmentUsersRequest holds the request params for fetching department user list.
type DepartmentUsersRequest struct {
	DepartmentID        string `json:"department_id"`
	StartTimestamp      int64  `json:"start_timestamp"`
	EndTimestamp        int64  `json:"end_timestamp"`
	Page                int    `json:"page"`
	PageSize            int    `json:"page_size"`
	SortBy              string `json:"sort_by"`
	SortOrder           string `json:"sort_order"`
	RegistrationStatus  string `json:"registration_status"`
	IncludeUnregistered bool   `json:"include_unregistered"`
}

const (
	departmentRegistrationStatusRegistered   = "registered"
	departmentRegistrationStatusUnregistered = "unregistered"
)

// DepartmentUserItem holds user info with stats for a specific time range.
type DepartmentUserItem struct {
	*model.User
	TotalAmountCNY float64 `json:"total_amount_cny"`
	AvgPricePerMT  float64 `json:"avg_price_per_mt"`
	TotalTokens    int64   `json:"total_tokens"`
	TotalRequests  int64   `json:"total_requests"`
	CommonModel    string  `json:"common_model"`
	IsRegistered   bool    `json:"is_registered"`
	SubQuotaUsed   int64   `json:"sub_quota_used"`
	SubQuotaTotal  int64   `json:"sub_quota_total"`
}

func buildUnregisteredDepartmentUser(openID string, member feishuDeptMember) *model.User {
	displayName := member.Name
	if displayName == "" {
		displayName = "-"
	}
	return &model.User{
		Id:          0,
		Username:    displayName,
		DisplayName: displayName,
		OpenId:      openID,
		Status:      0,
	}
}

func mergeDepartmentUsersWithMembers(users []*model.User, memberOpenIDs []string, memberDetails map[string]feishuDeptMember, includeUnregistered bool, registrationStatus string) []DepartmentUserItem {
	userMap := make(map[string]*model.User, len(users))
	for _, u := range users {
		if u.OpenId != "" {
			userMap[u.OpenId] = u
		}
	}

	result := make([]DepartmentUserItem, 0, len(memberOpenIDs))
	seen := make(map[string]bool, len(memberOpenIDs))
	for _, openID := range memberOpenIDs {
		if openID == "" || seen[openID] {
			continue
		}
		seen[openID] = true
		if u, ok := userMap[openID]; ok {
			if registrationStatus == departmentRegistrationStatusUnregistered {
				continue
			}
			result = append(result, DepartmentUserItem{User: u, IsRegistered: true})
			continue
		}
		if !includeUnregistered || registrationStatus == departmentRegistrationStatusRegistered {
			continue
		}
		result = append(result, DepartmentUserItem{User: buildUnregisteredDepartmentUser(openID, memberDetails[openID])})
	}
	return result
}

func sortDepartmentUserItems(items []DepartmentUserItem, sortBy string, sortOrder string) {
	desc := sortOrder == "desc" || (sortBy == "" && sortOrder == "")
	sort.Slice(items, func(i, j int) bool {
		var less bool
		switch sortBy {
		case "sub_quota_used":
			less = items[i].SubQuotaUsed < items[j].SubQuotaUsed
		case "total_amount_cny":
			less = items[i].TotalAmountCNY < items[j].TotalAmountCNY
		case "avg_price_per_mt":
			less = items[i].AvgPricePerMT < items[j].AvgPricePerMT
		case "total_tokens":
			less = items[i].TotalTokens < items[j].TotalTokens
		case "total_requests":
			less = items[i].TotalRequests < items[j].TotalRequests
		default:
			less = items[i].User.Id < items[j].User.Id
		}
		if desc {
			return !less
		}
		return less
	})
}

// DepartmentUsersResponse holds paginated department user list.
type DepartmentUsersResponse struct {
	Items             []DepartmentUserItem `json:"items"`
	Total             int64                `json:"total"`
	Page              int                  `json:"page"`
	Size              int                  `json:"page_size"`
	TotalUsers        int64                `json:"total_users"`
	RegisteredUsers   int64                `json:"registered_users"`
	UnregisteredUsers int64                `json:"unregistered_users"`
}

// GetDepartmentUsers returns paginated user list for a department with stats in the given time range.
func GetDepartmentUsers(req *DepartmentUsersRequest) (*DepartmentUsersResponse, error) {
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
		return &DepartmentUsersResponse{Items: []DepartmentUserItem{}, Page: req.Page, Size: req.PageSize}, nil
	}

	// Single-pass: always fetch member details (cached 30min), extract open_ids from it.
	members, err := getAllMemberDetailsUnderDepts(token, openDeptIDs)
	if err != nil {
		return nil, fmt.Errorf("get department member details: %w", err)
	}
	memberDetails := make(map[string]feishuDeptMember, len(members))
	memberOpenIDs := make([]string, 0, len(members))
	for _, member := range members {
		if member.OpenID == "" {
			continue
		}
		memberOpenIDs = append(memberOpenIDs, member.OpenID)
		memberDetails[member.OpenID] = member
	}
	includeUnregistered := req.RegistrationStatus == departmentRegistrationStatusUnregistered ||
		(req.RegistrationStatus != departmentRegistrationStatusRegistered && req.IncludeUnregistered)

	if len(memberOpenIDs) == 0 {
		return &DepartmentUsersResponse{Items: []DepartmentUserItem{}, Page: req.Page, Size: req.PageSize}, nil
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	startIdx := (page - 1) * pageSize

	sortByComputed := common.IsComputedSortColumn(req.SortBy)
	if sortByComputed {
		users, _, err := model.GetUsersByOpenIDs(memberOpenIDs, 0, len(memberOpenIDs), "", "")
		if err != nil {
			return nil, fmt.Errorf("get users by open_ids: %w", err)
		}
		totalUsers := int64(len(memberOpenIDs))
		registeredUsers := int64(len(users))
		unregisteredUsers := totalUsers - registeredUsers
		if unregisteredUsers < 0 {
			unregisteredUsers = 0
		}
		if len(users) == 0 {
			allItems := mergeDepartmentUsersWithMembers(users, memberOpenIDs, memberDetails, includeUnregistered, req.RegistrationStatus)
			start := startIdx
			end := start + pageSize
			if start > len(allItems) {
				start = len(allItems)
			}
			if end > len(allItems) {
				end = len(allItems)
			}
			return &DepartmentUsersResponse{
				Items:             allItems[start:end],
				Total:             int64(len(allItems)),
				Page:              page,
				Size:              pageSize,
				TotalUsers:        totalUsers,
				RegisteredUsers:   registeredUsers,
				UnregisteredUsers: unregisteredUsers,
			}, nil
		}
		ids := make([]int, len(users))
		for i, u := range users {
			ids[i] = u.Id
		}
		subMap, _ := model.GetActiveSubscriptionQuotaByUserIds(ids)
		if subMap == nil {
			subMap = make(map[int]*model.UserSubscriptionQuotaSummary)
		}
		userStats := make(map[int]model.UserStatRow)
		statRows, err := model.GetUserStatsBatch(ids, req.StartTimestamp, req.EndTimestamp)
		if err == nil {
			for _, row := range statRows {
				userStats[row.UserID] = row
			}
		}
		commonModels := make(map[int]string)
		modelRows, err := model.GetUserModelStatsBatch(ids, req.StartTimestamp, req.EndTimestamp)
		if err == nil {
			for _, row := range modelRows {
				if _, ok := commonModels[row.UserID]; !ok {
					commonModels[row.UserID] = row.ModelName
				}
			}
		}
		quotaPerUnit := common.QuotaPerUnit
		if quotaPerUnit <= 0 {
			quotaPerUnit = 500000
		}
		usdExchangeRate := operation_setting.USDExchangeRate
		if usdExchangeRate <= 0 {
			usdExchangeRate = 1
		}
		allItems := mergeDepartmentUsersWithMembers(users, memberOpenIDs, memberDetails, includeUnregistered, req.RegistrationStatus)
		for i := range allItems {
			u := allItems[i].User
			if u.Id == 0 {
				continue
			}
			if s, ok := subMap[u.Id]; ok {
				allItems[i].SubQuotaUsed = s.AmountUsed
				allItems[i].SubQuotaTotal = s.AmountTotal
			}
			if stat, ok := userStats[u.Id]; ok {
				allItems[i].TotalAmountCNY = float64(stat.TotalQuota) / quotaPerUnit * usdExchangeRate
				allItems[i].TotalTokens = stat.TotalTokens
				allItems[i].TotalRequests = stat.TotalReqs
				if allItems[i].TotalTokens > 0 {
					allItems[i].AvgPricePerMT = allItems[i].TotalAmountCNY / (float64(allItems[i].TotalTokens) / 1000000.0)
				}
			}
			allItems[i].CommonModel = commonModels[u.Id]
		}
		sortDepartmentUserItems(allItems, req.SortBy, req.SortOrder)
		start := startIdx
		end := start + pageSize
		if start > len(allItems) {
			start = len(allItems)
		}
		if end > len(allItems) {
			end = len(allItems)
		}
		return &DepartmentUsersResponse{
			Items:             allItems[start:end],
			Total:             int64(len(allItems)),
			Page:              page,
			Size:              pageSize,
			TotalUsers:        totalUsers,
			RegisteredUsers:   registeredUsers,
			UnregisteredUsers: unregisteredUsers,
		}, nil
	}

	users, _, err := model.GetUsersByOpenIDs(memberOpenIDs, 0, len(memberOpenIDs), req.SortBy, req.SortOrder)
	if err != nil {
		return nil, fmt.Errorf("get users by open_ids: %w", err)
	}

	if len(users) == 0 {
		allItems := mergeDepartmentUsersWithMembers(users, memberOpenIDs, memberDetails, includeUnregistered, req.RegistrationStatus)
		start := startIdx
		end := start + pageSize
		if start > len(allItems) {
			start = len(allItems)
		}
		if end > len(allItems) {
			end = len(allItems)
		}
		return &DepartmentUsersResponse{
			Items:             allItems[start:end],
			Total:             int64(len(allItems)),
			Page:              page,
			Size:              pageSize,
			TotalUsers:        int64(len(memberOpenIDs)),
			RegisteredUsers:   0,
			UnregisteredUsers: int64(len(memberOpenIDs)),
		}, nil
	}

	ids := make([]int, len(users))
	for i, u := range users {
		ids[i] = u.Id
	}

	subMap, err := model.GetActiveSubscriptionQuotaByUserIds(ids)
	if err != nil {
		subMap = make(map[int]*model.UserSubscriptionQuotaSummary)
	}

	userStats := make(map[int]model.UserStatRow)
	statRows, err := model.GetUserStatsBatch(ids, req.StartTimestamp, req.EndTimestamp)
	if err == nil {
		for _, row := range statRows {
			userStats[row.UserID] = row
		}
	}

	commonModels := make(map[int]string)
	modelRows, err := model.GetUserModelStatsBatch(ids, req.StartTimestamp, req.EndTimestamp)
	if err == nil {
		for _, row := range modelRows {
			if _, ok := commonModels[row.UserID]; !ok {
				commonModels[row.UserID] = row.ModelName
			}
		}
	}

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}

	result := mergeDepartmentUsersWithMembers(users, memberOpenIDs, memberDetails, includeUnregistered, req.RegistrationStatus)
	for i := range result {
		u := result[i].User
		if u.Id == 0 {
			continue
		}
		if s, ok := subMap[u.Id]; ok {
			result[i].SubQuotaUsed = s.AmountUsed
			result[i].SubQuotaTotal = s.AmountTotal
		}
		if stat, ok := userStats[u.Id]; ok {
			result[i].TotalAmountCNY = float64(stat.TotalQuota) / quotaPerUnit * usdExchangeRate
			result[i].TotalTokens = stat.TotalTokens
			result[i].TotalRequests = stat.TotalReqs
			if result[i].TotalTokens > 0 {
				result[i].AvgPricePerMT = result[i].TotalAmountCNY / (float64(result[i].TotalTokens) / 1000000.0)
			}
		}
		result[i].CommonModel = commonModels[u.Id]
	}
	sortDepartmentUserItems(result, req.SortBy, req.SortOrder)
	start := startIdx
	end := start + pageSize
	if start > len(result) {
		start = len(result)
	}
	if end > len(result) {
		end = len(result)
	}

	return &DepartmentUsersResponse{
		Items:             result[start:end],
		Total:             int64(len(result)),
		Page:              page,
		Size:              pageSize,
		TotalUsers:        int64(len(memberOpenIDs)),
		RegisteredUsers:   int64(len(users)),
		UnregisteredUsers: max(int64(len(memberOpenIDs)-len(users)), 0),
	}, nil
}

// UserRankingItem holds a single user's ranking info for charts.
type UserRankingItem struct {
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	TotalCost   float64 `json:"total_cost"`
	TotalTokens int64   `json:"total_tokens"`
}

// GetDepartmentUserRankings returns top 10 users by consumption for the given department and time range.
func GetDepartmentUserRankings(req *DepartmentUsersRequest) ([]UserRankingItem, error) {
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
		return []UserRankingItem{}, nil
	}

	// Reuse the same details cache as GetDepartmentUsers (30 min TTL)
	members, err := getAllMemberDetailsUnderDepts(token, openDeptIDs)
	if err != nil {
		return nil, fmt.Errorf("get department member details: %w", err)
	}
	memberOpenIDs := make([]string, 0, len(members))
	for _, m := range members {
		if m.OpenID != "" {
			memberOpenIDs = append(memberOpenIDs, m.OpenID)
		}
	}

	if len(memberOpenIDs) == 0 {
		return []UserRankingItem{}, nil
	}

	userInfos, err := model.GetUserIDAndNamesByOpenIDs(memberOpenIDs)
	if err != nil {
		return nil, fmt.Errorf("get user ids: %w", err)
	}
	if len(userInfos) == 0 {
		return []UserRankingItem{}, nil
	}

	ids := make([]int, len(userInfos))
	nameMap := make(map[int][2]string, len(userInfos))
	for i, u := range userInfos {
		ids[i] = u.Id
		nameMap[u.Id] = [2]string{u.Username, u.DisplayName}
	}

	statRows, err := model.GetUserStatsBatch(ids, req.StartTimestamp, req.EndTimestamp)
	if err != nil {
		return nil, fmt.Errorf("get user stats: %w", err)
	}

	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	usdExchangeRate := operation_setting.USDExchangeRate
	if usdExchangeRate <= 0 {
		usdExchangeRate = 1
	}

	sort.Slice(statRows, func(i, j int) bool {
		return statRows[i].TotalQuota > statRows[j].TotalQuota
	})

	limit := 10
	if len(statRows) < limit {
		limit = len(statRows)
	}

	result := make([]UserRankingItem, 0, limit)
	for _, row := range statRows[:limit] {
		if row.TotalQuota <= 0 {
			continue
		}
		names := nameMap[row.UserID]
		result = append(result, UserRankingItem{
			Username:    names[0],
			DisplayName: names[1],
			TotalCost:   float64(row.TotalQuota) / float64(quotaPerUnit) * usdExchangeRate,
			TotalTokens: row.TotalTokens,
		})
	}

	return result, nil
}

func getAllMemberDetailsUnderDepts(token string, openDeptIDs []string) ([]feishuDeptMember, error) {
	seen := make(map[string]bool)
	var result []feishuDeptMember
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

			members, err := getCachedDepartmentMemberDetails(token, deptID)
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}

			mu.Lock()
			for _, member := range members {
				if member.OpenID != "" && !seen[member.OpenID] {
					seen[member.OpenID] = true
					result = append(result, member)
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
