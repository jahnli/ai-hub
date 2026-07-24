package service

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

var ErrCompanyIDRequired = errors.New("company_id is required when company data overview is enabled")
var ErrCompanyAccessDenied = errors.New("company is disabled, missing, or not accessible")
var ErrDepartmentAccessDenied = errors.New("department is not accessible")

const companyDirectoryFetchConcurrency = 5

type overviewAudience struct {
	company             *model.Company
	directory           *overviewDirectory
	departmentID        string
	members             []overviewMember
	users               []*model.User
	registeredUserIDs   []int
	totalUsers          int
	forceRegisteredOnly bool
}

func CompanyDataOverviewEnabled() (bool, error) {
	count, err := model.CountCompanies()
	return count > 0, err
}

func companyNodeValue(companyID int) string {
	return fmt.Sprintf("company:%d", companyID)
}

func departmentNodeValue(companyID int, departmentID string) string {
	return fmt.Sprintf("dept:%d:%s", companyID, departmentID)
}

func parseCompanyDepartmentValue(companyID int, value string) (string, bool, error) {
	if value == companyNodeValue(companyID) {
		return "", true, nil
	}
	prefix := fmt.Sprintf("dept:%d:", companyID)
	if strings.HasPrefix(value, prefix) {
		rawID := strings.TrimPrefix(value, prefix)
		if rawID == "" {
			return "", false, errors.New("department_id is invalid")
		}
		return rawID, false, nil
	}
	if strings.HasPrefix(value, "company:") || strings.HasPrefix(value, "dept:") {
		return "", false, ErrDepartmentAccessDenied
	}
	if strings.TrimSpace(value) == "" {
		return "", false, errors.New("department_id is required")
	}
	return value, false, nil
}

func getAuthorizedOverviewCompany(companyID int, userID int, userRole int) (*model.Company, error) {
	company, err := model.GetEnabledCompanyByID(companyID)
	if err != nil {
		return nil, ErrCompanyAccessDenied
	}
	if userRole >= common.RoleRootUser {
		return company, nil
	}
	user, err := model.GetUserById(userID, false)
	if err != nil || user.Company != company.Name {
		return nil, ErrCompanyAccessDenied
	}
	return company, nil
}

func buildOverviewDepartmentTree(companyID int, platform string, departments []overviewDepartment) []*DeptTreeNode {
	nodeMap := make(map[string]*DeptTreeNode, len(departments))
	childrenMap := make(map[string][]string, len(departments))
	for _, department := range departments {
		nodeMap[department.ID] = &DeptTreeNode{
			Value:        departmentNodeValue(companyID, department.ID),
			Label:        department.Name,
			CompanyID:    companyID,
			Platform:     platform,
			NodeType:     "department",
			DepartmentID: department.ID,
			LeaderUserID: department.LeaderUserID,
			Children:     []*DeptTreeNode{},
		}
		childrenMap[department.ParentID] = append(childrenMap[department.ParentID], department.ID)
	}
	for _, department := range departments {
		node := nodeMap[department.ID]
		for _, childID := range childrenMap[department.ID] {
			if child := nodeMap[childID]; child != nil {
				node.Children = append(node.Children, child)
			}
		}
	}
	roots := make([]*DeptTreeNode, 0)
	for _, department := range departments {
		if department.ParentID == "" || department.ParentID == "0" || department.ParentID == "1" || nodeMap[department.ParentID] == nil {
			roots = append(roots, nodeMap[department.ID])
		}
	}
	return roots
}

func prefixLeaderDepartmentIDs(companyID int, ids []string) []string {
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		if id != "" {
			result = append(result, departmentNodeValue(companyID, id))
		}
	}
	return result
}

func getCompanyDepartmentTree(userID int, userRole int) (*DepartmentTreeResponse, error) {
	companies, err := model.ListEnabledCompanies()
	if err != nil {
		return nil, err
	}
	user, err := model.GetUserById(userID, false)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	visibleCompanies := make([]*model.Company, 0, len(companies))
	for _, company := range companies {
		if userRole < common.RoleRootUser && user.Company != company.Name {
			continue
		}
		visibleCompanies = append(visibleCompanies, company)
	}
	type companyTreeResult struct {
		node          *DeptTreeNode
		leaderDeptIDs []string
	}
	results := make([]companyTreeResult, len(visibleCompanies))
	leaderDepartmentIDs := user.GetLeaderDepartmentIDs()
	sem := make(chan struct{}, companyDirectoryFetchConcurrency)
	var wg sync.WaitGroup
	for index, company := range visibleCompanies {
		wg.Add(1)
		go func(index int, company *model.Company) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			label := company.Name
			if company.Alias != "" {
				label = company.Alias
			}
			companyNode := &DeptTreeNode{
				Value:     companyNodeValue(company.Id),
				Label:     label,
				CompanyID: company.Id,
				Platform:  company.Platform,
				NodeType:  "company",
				Children:  []*DeptTreeNode{},
			}
			results[index].node = companyNode
			if company.Platform == model.CompanyPlatformNone {
				return
			}
			// Lazily load department trees: only the first company is fetched
			// eagerly. Other companies expose a company-level node with
			// Loading=true so the frontend can fetch their subtree on demand
			// when the user expands them in the selector.
			if index != 0 {
				companyNode.Loading = true
				return
			}
			directory, loadErr := fetchCompanyDirectory(company)
			if loadErr != nil {
				companyNode.Disabled = true
				companyNode.Error = loadErr.Error()
				return
			}
			if directory.OrganizationName != company.Name {
				companyNode.Disabled = true
				companyNode.Error = fmt.Sprintf("organization name %q does not exactly match company name %q", directory.OrganizationName, company.Name)
				return
			}
			fullTree := buildOverviewDepartmentTree(company.Id, company.Platform, directory.Departments)
			leaderIDs := prefixLeaderDepartmentIDs(company.Id, leaderDepartmentIDs)
			trimmed, visibleLeaderIDs := trimTreeForUser(fullTree, userRole, user.OpenId, user.DepartmentName, leaderIDs)
			companyNode.Disabled = userRole < common.RoleRootUser
			companyNode.Children = trimmed
			results[index].leaderDeptIDs = visibleLeaderIDs
		}(index, company)
	}
	wg.Wait()

	response := &DepartmentTreeResponse{TreeData: make([]*DeptTreeNode, 0, len(results)), LeaderDeptIDs: []string{}}
	for _, result := range results {
		response.TreeData = append(response.TreeData, result.node)
		response.LeaderDeptIDs = append(response.LeaderDeptIDs, result.leaderDeptIDs...)
	}
	return response, nil
}

// CompanySubtreeResponse is the on-demand payload for a single company's
// department subtree, returned when the frontend lazily expands a company node.
type CompanySubtreeResponse struct {
	Node          *DeptTreeNode `json:"node"`
	LeaderDeptIDs []string      `json:"leader_dept_ids"`
}

// GetCompanySubtreeNode fetches and builds the department subtree for a single
// company. It mirrors the per-company logic in getCompanyDepartmentTree but is
// invoked lazily when the user expands a company node that was returned with
// Loading=true. It enforces the same access checks and permission trimming.
func GetCompanySubtreeNode(companyID int, userID int, userRole int) (*CompanySubtreeResponse, error) {
	enabled, err := CompanyDataOverviewEnabled()
	if err != nil {
		return nil, err
	}
	if !enabled {
		return nil, ErrCompanyIDRequired
	}
	if companyID <= 0 {
		return nil, ErrCompanyIDRequired
	}
	company, err := getAuthorizedOverviewCompany(companyID, userID, userRole)
	if err != nil {
		return nil, err
	}
	user, err := model.GetUserById(userID, false)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	label := company.Name
	if company.Alias != "" {
		label = company.Alias
	}
	companyNode := &DeptTreeNode{
		Value:     companyNodeValue(company.Id),
		Label:     label,
		CompanyID: company.Id,
		Platform:  company.Platform,
		NodeType:  "company",
		Children:  []*DeptTreeNode{},
	}
	response := &CompanySubtreeResponse{Node: companyNode, LeaderDeptIDs: []string{}}
	if company.Platform == model.CompanyPlatformNone {
		return response, nil
	}
	directory, loadErr := fetchCompanyDirectory(company)
	if loadErr != nil {
		companyNode.Disabled = true
		companyNode.Error = loadErr.Error()
		return response, nil
	}
	if directory.OrganizationName != company.Name {
		companyNode.Disabled = true
		companyNode.Error = fmt.Sprintf("organization name %q does not exactly match company name %q", directory.OrganizationName, company.Name)
		return response, nil
	}
	fullTree := buildOverviewDepartmentTree(company.Id, company.Platform, directory.Departments)
	leaderIDs := prefixLeaderDepartmentIDs(company.Id, user.GetLeaderDepartmentIDs())
	trimmed, visibleLeaderIDs := trimTreeForUser(fullTree, userRole, user.OpenId, user.DepartmentName, leaderIDs)
	companyNode.Disabled = userRole < common.RoleRootUser
	companyNode.Children = trimmed
	response.LeaderDeptIDs = visibleLeaderIDs
	return response, nil
}

func ensureDepartmentAccessible(company *model.Company, directory *overviewDirectory, departmentID string, companyRoot bool, userID int, userRole int) error {
	if company.Platform == model.CompanyPlatformNone {
		if companyRoot {
			return nil
		}
		return ErrDepartmentAccessDenied
	}
	if directory.OrganizationName != company.Name {
		return fmt.Errorf("organization name %q does not exactly match company name %q", directory.OrganizationName, company.Name)
	}
	if userRole >= common.RoleRootUser {
		return nil
	}
	if companyRoot {
		return ErrDepartmentAccessDenied
	}
	user, err := model.GetUserById(userID, false)
	if err != nil {
		return ErrDepartmentAccessDenied
	}
	fullTree := buildOverviewDepartmentTree(company.Id, company.Platform, directory.Departments)
	leaders := prefixLeaderDepartmentIDs(company.Id, user.GetLeaderDepartmentIDs())
	trimmed, _ := trimTreeForUser(fullTree, userRole, user.OpenId, user.DepartmentName, leaders)
	node := findNodeByValue(trimmed, departmentNodeValue(company.Id, departmentID))
	if node == nil || node.Disabled {
		return ErrDepartmentAccessDenied
	}
	return nil
}

func findNodeByValue(nodes []*DeptTreeNode, value string) *DeptTreeNode {
	for _, node := range nodes {
		if node.Value == value {
			return node
		}
		if found := findNodeByValue(node.Children, value); found != nil {
			return found
		}
	}
	return nil
}

func collectOverviewDepartmentIDs(departments []overviewDepartment, departmentID string, companyRoot bool, platform string) []string {
	if companyRoot {
		result := make([]string, 0, len(departments)+1)
		if platform == model.CompanyPlatformFeishu {
			result = append(result, "0")
		}
		if platform == model.CompanyPlatformDingTalk {
			result = append(result, strconv.FormatInt(dingTalkDeptRootID, 10))
		}
		for _, department := range departments {
			result = append(result, department.ID)
		}
		return result
	}
	known := make(map[string]bool, len(departments))
	children := make(map[string][]string, len(departments))
	for _, department := range departments {
		known[department.ID] = true
		children[department.ParentID] = append(children[department.ParentID], department.ID)
	}
	result := make([]string, 0)
	queue := []string{departmentID}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if known[current] {
			result = append(result, current)
		}
		queue = append(queue, children[current]...)
	}
	return result
}

func resolveCompanyOverviewAudience(companyID int, departmentValue string, userID int, userRole int, registeredBefore int64) (*overviewAudience, bool, error) {
	enabled, err := CompanyDataOverviewEnabled()
	if err != nil {
		return nil, false, err
	}
	if !enabled {
		return nil, false, nil
	}
	if companyID <= 0 {
		return nil, true, ErrCompanyIDRequired
	}
	company, err := getAuthorizedOverviewCompany(companyID, userID, userRole)
	if err != nil {
		return nil, true, err
	}
	departmentID, companyRoot, err := parseCompanyDepartmentValue(company.Id, departmentValue)
	if err != nil {
		return nil, true, err
	}
	audience := &overviewAudience{company: company, departmentID: departmentID}
	if company.Platform == model.CompanyPlatformNone {
		if !companyRoot {
			return nil, true, ErrDepartmentAccessDenied
		}
		users, err := queryOverviewUsers(company.Name, nil, registeredBefore)
		if err != nil {
			return nil, true, err
		}
		audience.users = users
		audience.registeredUserIDs = userIDsFromUsers(users)
		audience.totalUsers = len(users)
		audience.forceRegisteredOnly = true
		return audience, true, nil
	}
	directory, err := fetchCompanyDirectory(company)
	if err != nil {
		return nil, true, err
	}
	if err := ensureDepartmentAccessible(company, directory, departmentID, companyRoot, userID, userRole); err != nil {
		return nil, true, err
	}
	departmentIDs := collectOverviewDepartmentIDs(directory.Departments, departmentID, companyRoot, company.Platform)
	if len(departmentIDs) == 0 {
		return audience, true, nil
	}
	members, err := collectCompanyMembers(company, departmentIDs)
	if err != nil {
		return nil, true, err
	}
	openIDs := make([]string, 0, len(members))
	for _, member := range members {
		openIDs = append(openIDs, member.OpenID)
	}
	users, err := queryOverviewUsers(company.Name, openIDs, registeredBefore)
	if err != nil {
		return nil, true, err
	}
	audience.directory = directory
	audience.members = members
	audience.users = users
	audience.registeredUserIDs = userIDsFromUsers(users)
	audience.totalUsers = len(members)
	return audience, true, nil
}

func collectCompanyMembers(company *model.Company, departmentIDs []string) ([]overviewMember, error) {
	seen := make(map[string]bool)
	result := make([]overviewMember, 0)
	var mu sync.Mutex
	var firstErr error
	var once sync.Once
	sem := make(chan struct{}, deptMembersFetchConcurrency)
	var wg sync.WaitGroup
	for _, departmentID := range departmentIDs {
		wg.Add(1)
		go func(rawID string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			members, err := fetchCompanyMembers(company, rawID)
			if err != nil {
				once.Do(func() { firstErr = err })
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
		}(departmentID)
	}
	wg.Wait()
	return result, firstErr
}

func queryOverviewUsers(companyName string, openIDs []string, registeredBefore int64) ([]*model.User, error) {
	query := model.DB.Model(&model.User{}).Where("company = ?", companyName)
	if openIDs != nil {
		if len(openIDs) == 0 {
			return []*model.User{}, nil
		}
		query = query.Where("open_id IN ?", openIDs)
	}
	if registeredBefore > 0 {
		query = query.Where("created_at <= ?", registeredBefore)
	}
	var users []*model.User
	if err := query.Omit("password").Find(&users).Error; err != nil {
		return nil, err
	}
	exactUsers := make([]*model.User, 0, len(users))
	for _, user := range users {
		if user.Company == companyName {
			exactUsers = append(exactUsers, user)
		}
	}
	return exactUsers, nil
}

func userIDsFromUsers(users []*model.User) []int {
	ids := make([]int, 0, len(users))
	for _, user := range users {
		ids = append(ids, user.Id)
	}
	return ids
}

func authorizeCompanyOverviewUser(companyID int, departmentID string, targetUserID int, requestUserID int, requestUserRole int) error {
	enabled, err := CompanyDataOverviewEnabled()
	if err != nil || !enabled {
		return err
	}
	if companyID <= 0 && requestUserRole >= common.RoleRootUser {
		return nil
	}
	audience, _, err := resolveCompanyOverviewAudience(companyID, departmentID, requestUserID, requestUserRole, 0)
	if err != nil {
		return err
	}
	for _, userID := range audience.registeredUserIDs {
		if userID == targetUserID {
			return nil
		}
	}
	return ErrDepartmentAccessDenied
}

func directOverviewChildren(directory *overviewDirectory, parentID string, companyRoot bool) []overviewDepartment {
	children := make([]overviewDepartment, 0)
	known := make(map[string]bool, len(directory.Departments))
	for _, department := range directory.Departments {
		known[department.ID] = true
	}
	for _, department := range directory.Departments {
		if companyRoot {
			if department.ParentID == "" || department.ParentID == "0" || department.ParentID == "1" || !known[department.ParentID] {
				children = append(children, department)
			}
			continue
		}
		if department.ParentID == parentID {
			children = append(children, department)
		}
	}
	return children
}

func getCompanyDepartmentStats(req *DepartmentStatsRequest) (*model.DepartmentStat, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	threshold := getActiveUserThreshold(req.StartTimestamp, req.EndTimestamp)
	stat, err := model.GetDepartmentStats(
		audience.registeredUserIDs,
		req.StartTimestamp,
		req.EndTimestamp,
		threshold.RequestCount,
		threshold.TokenCount,
		[3]float64(threshold.Formula),
	)
	if err != nil {
		return nil, err
	}
	stat.RegisteredUsers = int64(len(audience.registeredUserIDs))
	stat.UnregisteredUsers = int64(audience.totalUsers) - stat.RegisteredUsers
	if audience.forceRegisteredOnly || stat.UnregisteredUsers < 0 {
		stat.UnregisteredUsers = 0
	}
	finalizeDepartmentStat(stat)
	return stat, nil
}

func finalizeDepartmentStat(stat *model.DepartmentStat) {
	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	exchangeRate := operation_setting.USDExchangeRate
	if exchangeRate <= 0 {
		exchangeRate = 1
	}
	stat.TotalAmountCNY = float64(stat.TotalQuota) / quotaPerUnit * exchangeRate
	if stat.TotalTokens > 0 {
		stat.AvgPricePerMT = stat.TotalAmountCNY / (float64(stat.TotalTokens) / 1000000)
	}
	totalUsers := stat.RegisteredUsers + stat.UnregisteredUsers
	if totalUsers > 0 {
		stat.ActiveUserRate = float64(stat.ActiveUsers) / float64(totalUsers) * 100
	}
	if stat.ActiveUsers > 0 {
		stat.AvgTokensPerActiveUserMT = float64(stat.TotalTokens) / float64(stat.ActiveUsers) / 1000000
	}
}

func getCompanyDepartmentLogs(req *DepartmentLogsRequest) (*common.PageInfo, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	pageInfo := departmentLogsPageInfo(req.Page, req.PageSize)
	if len(audience.registeredUserIDs) == 0 {
		pageInfo.SetItems([]*model.Log{})
		return pageInfo, nil
	}
	logs, total, err := model.GetLogsByUserIds(
		audience.registeredUserIDs,
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

func getCompanyUsageAnalysis(req *DepartmentStatsRequest) (*UsageAnalysisResponse, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	if len(audience.registeredUserIDs) == 0 {
		return &UsageAnalysisResponse{}, nil
	}
	return buildUsageAnalysisForUsers(audience.registeredUserIDs, req.StartTimestamp, req.EndTimestamp)
}

func getCompanySubDepartmentStats(req *DepartmentStatsRequest) ([]SubDepartmentStatItem, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	if audience.company.Platform == model.CompanyPlatformNone {
		return []SubDepartmentStatItem{}, nil
	}
	_, companyRoot, err := parseCompanyDepartmentValue(req.CompanyID, req.DepartmentID)
	if err != nil {
		return nil, err
	}
	children := directOverviewChildren(audience.directory, audience.departmentID, companyRoot)
	type childOverviewData struct {
		members []overviewMember
		users   []*model.User
	}
	childData := make([]childOverviewData, len(children))
	errs := make([]error, len(children))
	var wg sync.WaitGroup
	for index, child := range children {
		wg.Add(1)
		go func(index int, child overviewDepartment) {
			defer wg.Done()
			if childErr := ensureDepartmentAccessible(
				audience.company,
				audience.directory,
				child.ID,
				false,
				req.RequestUserID,
				req.RequestUserRole,
			); childErr != nil {
				errs[index] = childErr
				return
			}
			departmentIDs := collectOverviewDepartmentIDs(
				audience.directory.Departments,
				child.ID,
				false,
				audience.company.Platform,
			)
			members, childErr := collectCompanyMembers(audience.company, departmentIDs)
			if childErr != nil {
				errs[index] = childErr
				return
			}
			openIDs := make([]string, 0, len(members))
			for _, member := range members {
				openIDs = append(openIDs, member.OpenID)
			}
			users, childErr := queryOverviewUsers(audience.company.Name, openIDs, req.EndTimestamp)
			if childErr != nil {
				errs[index] = childErr
				return
			}
			childData[index] = childOverviewData{members: members, users: users}
		}(index, child)
	}
	wg.Wait()

	visibleChildren := make([]bool, len(children))
	allUserIDs := make([]int, 0)
	userToChild := make(map[int]int)
	for index, data := range childData {
		if errs[index] != nil {
			if errors.Is(errs[index], ErrDepartmentAccessDenied) {
				continue
			}
			return nil, errs[index]
		}
		visibleChildren[index] = true
		for _, user := range data.users {
			if _, exists := userToChild[user.Id]; exists {
				continue
			}
			userToChild[user.Id] = index
			allUserIDs = append(allUserIDs, user.Id)
		}
	}

	rows, err := model.GetUserStatsBatch(allUserIDs, req.StartTimestamp, req.EndTimestamp)
	if err != nil {
		return nil, fmt.Errorf("get user stats batch: %w", err)
	}
	type childAggregate struct {
		totalTokens   int64
		totalQuota    int64
		totalRequests int64
		activeUsers   int64
	}
	aggregates := make([]childAggregate, len(children))
	threshold := getActiveUserThreshold(req.StartTimestamp, req.EndTimestamp)
	for _, row := range rows {
		index, ok := userToChild[row.UserID]
		if !ok {
			continue
		}
		aggregates[index].totalTokens += row.TotalTokens
		aggregates[index].totalQuota += row.TotalQuota
		aggregates[index].totalRequests += row.TotalReqs
		if row.TotalReqs >= threshold.RequestCount || row.TotalTokens >= threshold.TokenCount {
			aggregates[index].activeUsers++
		}
	}

	result := make([]SubDepartmentStatItem, 0, len(children))
	for index, child := range children {
		if !visibleChildren[index] {
			continue
		}
		stat := &model.DepartmentStat{
			RegisteredUsers: int64(len(childData[index].users)),
			UnregisteredUsers: int64(len(childData[index].members)) -
				int64(len(childData[index].users)),
			TotalQuota:    aggregates[index].totalQuota,
			TotalTokens:   aggregates[index].totalTokens,
			TotalRequests: aggregates[index].totalRequests,
			ActiveUsers:   aggregates[index].activeUsers,
		}
		if stat.UnregisteredUsers < 0 {
			stat.UnregisteredUsers = 0
		}
		finalizeDepartmentStat(stat)
		result = append(result, SubDepartmentStatItem{
			DepartmentID:             departmentNodeValue(req.CompanyID, child.ID),
			DepartmentName:           child.Name,
			RegisteredUsers:          stat.RegisteredUsers,
			TotalUsers:               stat.RegisteredUsers + stat.UnregisteredUsers,
			TotalQuota:               stat.TotalQuota,
			TotalAmountCNY:           stat.TotalAmountCNY,
			AvgPricePerMT:            stat.AvgPricePerMT,
			TotalTokens:              stat.TotalTokens,
			TotalRequests:            stat.TotalRequests,
			ActiveUsers:              stat.ActiveUsers,
			ActiveUserRate:           stat.ActiveUserRate,
			AvgTokensPerActiveUserMT: stat.AvgTokensPerActiveUserMT,
		})
	}
	return result, nil
}

func getCompanyDepartmentUsers(req *DepartmentUsersRequest) (*DepartmentUsersResponse, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
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

	items := make([]DepartmentUserItem, 0)
	if audience.forceRegisteredOnly {
		if req.RegistrationStatus != departmentRegistrationStatusUnregistered {
			for _, user := range audience.users {
				items = append(items, DepartmentUserItem{User: user, IsRegistered: true})
			}
		}
	} else {
		memberOpenIDs := make([]string, 0, len(audience.members))
		memberDetails := make(map[string]feishuDeptMember, len(audience.members))
		for _, member := range audience.members {
			memberOpenIDs = append(memberOpenIDs, member.OpenID)
			memberDetails[member.OpenID] = feishuDeptMember{OpenID: member.OpenID, Name: member.Name}
		}
		includeUnregistered := req.RegistrationStatus == departmentRegistrationStatusUnregistered ||
			(req.RegistrationStatus != departmentRegistrationStatusRegistered && req.IncludeUnregistered)
		items = mergeDepartmentUsersWithMembers(audience.users, memberOpenIDs, memberDetails, req.EndTimestamp, includeUnregistered, req.RegistrationStatus)
	}

	ids := make([]int, 0, len(items))
	for _, item := range items {
		if item.User.Id > 0 && item.IsRegistered {
			ids = append(ids, item.User.Id)
		}
	}
	populateDepartmentUserStats(items, ids, req.StartTimestamp, req.EndTimestamp)
	sortDepartmentUserItems(items, req.SortBy, req.SortOrder)
	start := (page - 1) * pageSize
	if start > len(items) {
		start = len(items)
	}
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}
	registered, unregistered := departmentUserRegistrationCounts(audience.users, audience.totalUsers, req.EndTimestamp)
	if audience.forceRegisteredOnly {
		registered = int64(len(audience.users))
		unregistered = 0
	}
	return &DepartmentUsersResponse{
		Items:             items[start:end],
		Total:             int64(len(items)),
		Page:              page,
		Size:              pageSize,
		TotalUsers:        int64(audience.totalUsers),
		RegisteredUsers:   registered,
		UnregisteredUsers: unregistered,
	}, nil
}

func populateDepartmentUserStats(items []DepartmentUserItem, ids []int, startTimestamp int64, endTimestamp int64) {
	if len(ids) == 0 {
		return
	}
	subscriptions, _ := model.GetActiveSubscriptionQuotaByUserIds(ids)
	stats := make(map[int]model.UserStatRow)
	rows, err := model.GetUserStatsBatch(ids, startTimestamp, endTimestamp)
	if err == nil {
		for _, row := range rows {
			stats[row.UserID] = row
		}
	}
	models := make(map[int]string)
	modelRows, err := model.GetUserModelStatsBatch(ids, startTimestamp, endTimestamp)
	if err == nil {
		for _, row := range modelRows {
			if models[row.UserID] == "" {
				models[row.UserID] = row.ModelName
			}
		}
	}
	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	exchangeRate := operation_setting.USDExchangeRate
	if exchangeRate <= 0 {
		exchangeRate = 1
	}
	for index := range items {
		userID := items[index].User.Id
		if subscription := subscriptions[userID]; subscription != nil {
			items[index].SubQuotaUsed = subscription.AmountUsed
			items[index].SubQuotaTotal = subscription.AmountTotal
		}
		if stat, ok := stats[userID]; ok {
			items[index].TotalAmountCNY = float64(stat.TotalQuota) / quotaPerUnit * exchangeRate
			items[index].TotalTokens = stat.TotalTokens
			items[index].TotalRequests = stat.TotalReqs
			if stat.TotalTokens > 0 {
				items[index].AvgPricePerMT = items[index].TotalAmountCNY / (float64(stat.TotalTokens) / 1000000)
			}
		}
		items[index].CommonModel = models[userID]
	}
}

func getCompanyDepartmentUserRankings(req *DepartmentUsersRequest) ([]UserRankingItem, error) {
	audience, _, err := resolveCompanyOverviewAudience(req.CompanyID, req.DepartmentID, req.RequestUserID, req.RequestUserRole, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	if len(audience.registeredUserIDs) == 0 {
		return []UserRankingItem{}, nil
	}
	rows, err := model.GetUserStatsBatch(audience.registeredUserIDs, req.StartTimestamp, req.EndTimestamp)
	if err != nil {
		return nil, err
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].TotalQuota > rows[j].TotalQuota })
	names := make(map[int][2]string, len(audience.users))
	for _, user := range audience.users {
		names[user.Id] = [2]string{user.Username, user.DisplayName}
	}
	quotaPerUnit := common.QuotaPerUnit
	if quotaPerUnit <= 0 {
		quotaPerUnit = 500000
	}
	exchangeRate := operation_setting.USDExchangeRate
	if exchangeRate <= 0 {
		exchangeRate = 1
	}
	result := make([]UserRankingItem, 0, 10)
	for _, row := range rows {
		if row.TotalQuota <= 0 {
			continue
		}
		userNames := names[row.UserID]
		result = append(result, UserRankingItem{
			Username: userNames[0], DisplayName: userNames[1],
			TotalCost:   float64(row.TotalQuota) / float64(quotaPerUnit) * exchangeRate,
			TotalTokens: row.TotalTokens,
		})
		if len(result) == 10 {
			break
		}
	}
	return result, nil
}
