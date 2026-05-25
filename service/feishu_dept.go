package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

type I18nName struct {
	ZhCn string `json:"zh_cn"`
	EnUs string `json:"en_us"`
}

type FeishuDepartment struct {
	DepartmentId       string    `json:"open_department_id"`
	Name               string    `json:"name"`
	I18nName           *I18nName `json:"i18n_name,omitempty"`
	ParentDepartmentId string    `json:"parent_department_id"`
	LeaderUserId       string    `json:"leader_user_id"`
	MemberCount        int       `json:"member_count"`
}

func (d *FeishuDepartment) GetName() string {
	if d.Name != "" {
		return d.Name
	}
	if d.I18nName != nil {
		if d.I18nName.ZhCn != "" {
			return d.I18nName.ZhCn
		}
		if d.I18nName.EnUs != "" {
			return d.I18nName.EnUs
		}
	}
	return d.DepartmentId
}

type feishuDeptListResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		HasMore   bool                `json:"has_more"`
		PageToken string              `json:"page_token"`
		Items     []*FeishuDepartment `json:"items"`
	} `json:"data"`
}

type feishuTenantTokenResponse struct {
	Code              int    `json:"code"`
	Msg               string `json:"msg"`
	TenantAccessToken string `json:"tenant_access_token"`
	Expire            int    `json:"expire"`
}

var (
	tokenCache    string
	tokenExpireAt time.Time
	tokenMu       sync.RWMutex

	deptCache    []*FeishuDepartment
	deptCacheAt  time.Time
	deptCacheTTL = 5 * time.Minute
	deptMu       sync.RWMutex

	deptUsersCache    map[string][]*FeishuUser
	deptUsersCacheAt  time.Time
	deptUsersCacheTTL = 30 * time.Minute
	deptUsersMu       sync.RWMutex
)

func CheckAndUpdateDeptLeader(userId int, feishuOpenId string) error {
	if feishuOpenId == "" {
		return nil
	}

	tenantToken, err := GetTenantAccessToken()
	if err != nil {
		return fmt.Errorf("get tenant_access_token failed: %w", err)
	}

	departments, err := FetchAllDepartments(tenantToken)
	if err != nil {
		return fmt.Errorf("fetch departments failed: %w", err)
	}

	deptMap := make(map[string]*FeishuDepartment, len(departments))
	for _, dept := range departments {
		deptMap[dept.DepartmentId] = dept
	}

	isDeptLeader := false
	minLevel := 0

	for _, dept := range departments {
		if dept.LeaderUserId == feishuOpenId {
			isDeptLeader = true
			level := CalcDeptLevel(dept.DepartmentId, deptMap)
			if minLevel == 0 || level < minLevel {
				minLevel = level
			}
		}
	}

	err = model.DB.Model(&model.User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"is_dept_leader":    isDeptLeader,
		"leader_dept_level": minLevel,
	}).Error
	if err != nil {
		return fmt.Errorf("update user dept leader status failed: %w", err)
	}

	common.SysLog(fmt.Sprintf("[Feishu] User %d dept leader check: is_leader=%v, level=%d (open_id=%s, total_depts=%d)",
		userId, isDeptLeader, minLevel, feishuOpenId, len(departments)))

	return nil
}

func GetTenantAccessToken() (string, error) {
	tokenMu.RLock()
	if tokenCache != "" && time.Now().Before(tokenExpireAt) {
		cached := tokenCache
		tokenMu.RUnlock()
		return cached, nil
	}
	tokenMu.RUnlock()

	tokenMu.Lock()
	defer tokenMu.Unlock()

	if tokenCache != "" && time.Now().Before(tokenExpireAt) {
		return tokenCache, nil
	}

	body := map[string]string{
		"app_id":     os.Getenv("FEISHU_APP_ID"),
		"app_secret": os.Getenv("FEISHU_APP_SECRET"),
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST",
		"https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
		bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request tenant_access_token failed: %w", err)
	}
	defer res.Body.Close()

	var tokenResp feishuTenantTokenResponse
	if err = json.NewDecoder(res.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("decode tenant_access_token response failed: %w", err)
	}

	if tokenResp.Code != 0 {
		return "", fmt.Errorf("get tenant_access_token error: code=%d, msg=%s", tokenResp.Code, tokenResp.Msg)
	}

	tokenCache = tokenResp.TenantAccessToken
	tokenExpireAt = time.Now().Add(time.Duration(tokenResp.Expire-60) * time.Second)

	return tokenCache, nil
}

func FetchAllDepartments(tenantToken string) ([]*FeishuDepartment, error) {
	deptMu.RLock()
	if deptCache != nil && time.Now().Before(deptCacheAt.Add(deptCacheTTL)) {
		cached := deptCache
		deptMu.RUnlock()
		return cached, nil
	}
	deptMu.RUnlock()

	deptMu.Lock()
	defer deptMu.Unlock()

	if deptCache != nil && time.Now().Before(deptCacheAt.Add(deptCacheTTL)) {
		return deptCache, nil
	}

	var allDepts []*FeishuDepartment
	pageToken := ""

	for {
		url := "https://open.feishu.cn/open-apis/contact/v3/departments/0/children?department_id_type=open_department_id&fetch_child=true&page_size=50&user_id_type=open_id"
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+tenantToken)

		client := http.Client{Timeout: 20 * time.Second}
		res, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("request departments failed: %w", err)
		}

		var deptResp feishuDeptListResponse
		if err = json.NewDecoder(res.Body).Decode(&deptResp); err != nil {
			res.Body.Close()
			return nil, fmt.Errorf("decode departments response failed: %w", err)
		}
		res.Body.Close()

		if deptResp.Code != 0 {
			return nil, fmt.Errorf("fetch departments error: code=%d, msg=%s", deptResp.Code, deptResp.Msg)
		}

		allDepts = append(allDepts, deptResp.Data.Items...)

		if !deptResp.Data.HasMore {
			break
		}
		pageToken = deptResp.Data.PageToken
	}

	deptCache = allDepts
	deptCacheAt = time.Now()

	return allDepts, nil
}

// FeishuUser represents a user returned by the Feishu find_by_department API.
type FeishuUser struct {
	OpenId string `json:"open_id"`
	UserId string `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar struct {
		AvatarOrigin string `json:"avatar_origin"`
	} `json:"avatar"`
	DepartmentIds []string `json:"department_ids"`
}

type feishuUserListResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		HasMore   bool          `json:"has_more"`
		PageToken string        `json:"page_token"`
		Items     []*FeishuUser `json:"items"`
	} `json:"data"`
}

// FetchDepartmentUsers fetches all users from the given department IDs
// using the Feishu find_by_department API. Results are deduplicated by open_id.
// Concurrency is limited to 3 goroutines. Results are cached per-department for 30 minutes.
func FetchDepartmentUsers(tenantToken string, deptIds []string) ([]*FeishuUser, error) {
	deptUsersMu.RLock()
	cacheValid := deptUsersCache != nil && time.Now().Before(deptUsersCacheAt.Add(deptUsersCacheTTL))
	var missingIds []string
	if cacheValid {
		for _, id := range deptIds {
			if _, ok := deptUsersCache[id]; !ok {
				missingIds = append(missingIds, id)
			}
		}
	} else {
		missingIds = deptIds
	}
	deptUsersMu.RUnlock()

	if len(missingIds) > 0 {
		fetched, err := fetchDepartmentUsersBatch(tenantToken, missingIds)
		if err != nil {
			return nil, err
		}

		deptUsersMu.Lock()
		if deptUsersCache == nil || !time.Now().Before(deptUsersCacheAt.Add(deptUsersCacheTTL)) {
			deptUsersCache = make(map[string][]*FeishuUser)
			deptUsersCacheAt = time.Now()
		}
		for id, users := range fetched {
			deptUsersCache[id] = users
		}
		deptUsersMu.Unlock()
	}

	deptUsersMu.RLock()
	defer deptUsersMu.RUnlock()

	seen := make(map[string]bool)
	var allUsers []*FeishuUser
	for _, id := range deptIds {
		for _, u := range deptUsersCache[id] {
			if !seen[u.OpenId] {
				seen[u.OpenId] = true
				allUsers = append(allUsers, u)
			}
		}
	}
	return allUsers, nil
}

func fetchDepartmentUsersBatch(tenantToken string, deptIds []string) (map[string][]*FeishuUser, error) {
	type result struct {
		deptId string
		users  []*FeishuUser
		err    error
	}

	resultsCh := make(chan result, len(deptIds))
	sem := make(chan struct{}, 3)
	var wg sync.WaitGroup

	for _, deptId := range deptIds {
		wg.Add(1)
		go func(did string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			users, err := fetchUsersByDepartment(tenantToken, did)
			resultsCh <- result{deptId: did, users: users, err: err}
		}(deptId)
	}

	wg.Wait()
	close(resultsCh)

	fetched := make(map[string][]*FeishuUser, len(deptIds))
	for res := range resultsCh {
		if res.err != nil {
			return nil, res.err
		}
		fetched[res.deptId] = res.users
	}
	return fetched, nil
}

func fetchUsersByDepartment(tenantToken string, deptId string) ([]*FeishuUser, error) {
	var users []*FeishuUser
	pageToken := ""

	for {
		url := fmt.Sprintf(
			"https://open.feishu.cn/open-apis/contact/v3/users/find_by_department?department_id=%s&department_id_type=open_department_id&user_id_type=open_id&page_size=50",
			deptId,
		)
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+tenantToken)

		client := http.Client{Timeout: 20 * time.Second}
		res, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("request department users failed (dept=%s): %w", deptId, err)
		}

		var resp feishuUserListResponse
		if err = json.NewDecoder(res.Body).Decode(&resp); err != nil {
			res.Body.Close()
			return nil, fmt.Errorf("decode department users response failed (dept=%s): %w", deptId, err)
		}
		res.Body.Close()

		if resp.Code != 0 {
			return nil, fmt.Errorf("fetch department users error (dept=%s): code=%d, msg=%s", deptId, resp.Code, resp.Msg)
		}

		users = append(users, resp.Data.Items...)

		if !resp.Data.HasMore {
			break
		}
		pageToken = resp.Data.PageToken
	}

	return users, nil
}

// CalcDeptLevel calculates the depth of a department in the tree.
// Root children (parent_department_id == "0") are level 1.
func CalcDeptLevel(deptId string, deptMap map[string]*FeishuDepartment) int {
	level := 1
	current, ok := deptMap[deptId]
	if !ok {
		return level
	}
	for current != nil && current.ParentDepartmentId != "0" && current.ParentDepartmentId != "" {
		level++
		parent, exists := deptMap[current.ParentDepartmentId]
		if !exists {
			break
		}
		current = parent
	}
	return level
}
