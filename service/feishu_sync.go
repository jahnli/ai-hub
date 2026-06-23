package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/bytedance/gopkg/util/gopool"
)

const (
	feishuBaseURL     = "https://open.feishu.cn/open-apis"
	feishuHTTPTimeout = 10 * time.Second
)

// feishuSyncSummary 汇总一次飞书用户同步要写入数据库的字段。
type feishuSyncSummary struct {
	AvatarUrl       string
	OpenId          string
	DisplayName     string
	DepartmentIds   string // JSON 数组字符串
	DepartmentPath  string // JSON 数组字符串
	IsDeptLeader    bool
	LeaderDeptLevel int
	EmployeeNumber  string
}

// SyncFeishuUserAsync 在 goroutine 中同步飞书字段，不阻塞登录流程。失败仅记日志。
func SyncFeishuUserAsync(user *model.User) {
	if user == nil || user.Id == 0 {
		return
	}
	gopool.Go(func() {
		if err := SyncFeishuUser(user); err != nil {
			common.SysError(fmt.Sprintf("飞书字段同步失败 user=%s: %s", user.Username, err.Error()))
		}
	})
}

// SyncFeishuUser 以用户名拼邮箱 → 查 open_id → 拉取用户信息与工号 → 写回数据库。
func SyncFeishuUser(user *model.User) error {
	if !system_setting.FeishuEnabled() {
		return nil
	}
	if user == nil || user.Username == "" {
		return nil
	}

	token, err := feishuGetTenantAccessToken()
	if err != nil {
		return fmt.Errorf("get tenant_access_token: %w", err)
	}

	email := buildFeishuEmail(user.Username)
	openId, err := feishuGetOpenIDByEmail(token, email)
	if err != nil {
		return fmt.Errorf("lookup open_id by email %s: %w", email, err)
	}
	if openId == "" {
		return fmt.Errorf("open_id not found for email %s", email)
	}

	info, err := feishuGetUserInfo(token, openId)
	if err != nil {
		return fmt.Errorf("get user info: %w", err)
	}

	empNo, _ := feishuGetEmployeeNumber(token, openId)

	deptCache, _ := preloadDepartments(token)
	summary := buildFeishuSummary(info, openId, empNo, deptCache)
	if err := applyFeishuSummary(user.Id, summary); err != nil {
		return err
	}
	// 回写到 user 指针，使调用方（如 setupLogin）能立即读到飞书字段。
	user.AvatarUrl = summary.AvatarUrl
	user.DisplayName = summary.DisplayName
	return nil
}

// buildFeishuEmail 用用户名拼接飞书邮箱后缀。
func buildFeishuEmail(username string) string {
	return username + system_setting.FeishuEmailSuffix()
}

func feishuHTTPClient() *http.Client {
	return &http.Client{Timeout: feishuHTTPTimeout}
}

func feishuDoRequest(method, url string, body any, token string) ([]byte, int, error) {
	var reader io.Reader
	if body != nil {
		data, err := common.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, 0, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := feishuHTTPClient().Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	return respBody, resp.StatusCode, err
}

// feishuAPIResult 是飞书开放接口统一响应的壳。Data 用 json.RawMessage 保留原始字节，
// 由各调用方按需反序列化（规则 1：类型引用允许，反序列化通过 common.Unmarshal）。
type feishuAPIResult struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data json.RawMessage `json:"data"`
}

func feishuCheckResult(respBody []byte, status int) (*feishuAPIResult, error) {
	if status < 200 || status >= 300 {
		return nil, fmt.Errorf("http %d: %s", status, string(respBody))
	}
	var r feishuAPIResult
	if err := common.Unmarshal(respBody, &r); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if r.Code != 0 {
		return nil, fmt.Errorf("feishu code=%d msg=%s", r.Code, r.Msg)
	}
	return &r, nil
}

func feishuGetTenantAccessToken() (string, error) {
	body := map[string]string{
		"app_id":     system_setting.FeishuAppID(),
		"app_secret": system_setting.FeishuAppSecret(),
	}
	respBody, _, err := feishuDoRequest(http.MethodPost, feishuBaseURL+"/auth/v3/tenant_access_token/internal", body, "")
	if err != nil {
		return "", err
	}
	// tenant_access_token 接口的响应不在标准 data 壳内，单独解析。
	var resp struct {
		Code              int    `json:"code"`
		Msg               string `json:"msg"`
		TenantAccessToken string `json:"tenant_access_token"`
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
	return resp.TenantAccessToken, nil
}

// feishuGetOpenIDByEmail 通过邮箱查询用户的 open_id。
func feishuGetOpenIDByEmail(token, email string) (string, error) {
	url := feishuBaseURL + "/contact/v3/users/batch_get_id?user_id_type=open_id"
	body := map[string]any{
		"emails":           []string{email},
		"include_resigned": false,
	}
	respBody, status, err := feishuDoRequest(http.MethodPost, url, body, token)
	if err != nil {
		return "", err
	}
	r, err := feishuCheckResult(respBody, status)
	if err != nil {
		return "", err
	}
	var data struct {
		UserList []struct {
			UserID string `json:"user_id"`
		} `json:"user_list"`
	}
	if err := common.Unmarshal(r.Data, &data); err != nil {
		return "", fmt.Errorf("decode user_list: %w", err)
	}
	if len(data.UserList) == 0 {
		return "", nil
	}
	return data.UserList[0].UserID, nil
}

// feishuUserInfo 只抽取同步所需的字段。
type feishuUserInfo struct {
	Avatar struct {
		Avatar240 string `json:"avatar_240"`
	} `json:"avatar"`
	Name          string   `json:"name"`
	DepartmentIDs []string `json:"department_ids"`
	LeaderUserID  string   `json:"leader_user_id"`
}

func feishuGetUserInfo(token, openID string) (*feishuUserInfo, error) {
	url := fmt.Sprintf("%s/contact/v3/users/%s?user_id_type=open_id&department_id_type=open_department_id", feishuBaseURL, openID)
	respBody, status, err := feishuDoRequest(http.MethodGet, url, nil, token)
	if err != nil {
		return nil, err
	}
	r, err := feishuCheckResult(respBody, status)
	if err != nil {
		return nil, err
	}
	var data struct {
		User feishuUserInfo `json:"user"`
	}
	if err := common.Unmarshal(r.Data, &data); err != nil {
		return nil, fmt.Errorf("decode user: %w", err)
	}
	return &data.User, nil
}

// feishuGetEmployeeNumber 通过飞书 CoreHR 接口按 open_id 查询工号。
// 参考 feishu-sync 项目的 batchGetEmployeeNumbers：请求体 employment_id_list 传入 open_id。
func feishuGetEmployeeNumber(token, openID string) (string, error) {
	url := feishuBaseURL + "/corehr/v2/employees/search?page_size=1&user_id_type=open_id"
	body := map[string]any{
		"employment_id_list": []string{openID},
		"fields":             []string{"employee_number"},
	}
	respBody, status, err := feishuDoRequest(http.MethodPost, url, body, token)
	if err != nil {
		return "", err
	}
	r, err := feishuCheckResult(respBody, status)
	if err != nil {
		return "", err
	}
	var data struct {
		Items []struct {
			EmployeeNumber string `json:"employee_number"`
		} `json:"items"`
	}
	if err := common.Unmarshal(r.Data, &data); err != nil {
		return "", fmt.Errorf("decode employee_number: %w", err)
	}
	if len(data.Items) == 0 {
		return "", nil
	}
	return data.Items[0].EmployeeNumber, nil
}

// feishuDepartment 缓存部门信息用于构建部门路径。
type feishuDepartment struct {
	Name               string `json:"name"`
	ParentDepartmentID string `json:"parent_department_id"`
}

// preloadDepartments 拉取全部部门用于路径构建。失败时返回空缓存，路径退化为 id。
func preloadDepartments(token string) (map[string]feishuDepartment, error) {
	cache := map[string]feishuDepartment{}
	baseURL := feishuBaseURL + "/contact/v3/departments?department_id_type=open_department_id&parent_department_id=0&fetch_child=true&page_size=50"
	pageToken := ""
	for {
		url := baseURL
		if pageToken != "" {
			url += "&page_token=" + pageToken
		}
		respBody, status, err := feishuDoRequest(http.MethodGet, url, nil, token)
		if err != nil {
			return cache, err
		}
		r, err := feishuCheckResult(respBody, status)
		if err != nil {
			return cache, err
		}
		var data struct {
			Items []struct {
				OpenDepartmentID   string `json:"open_department_id"`
				Name               string `json:"name"`
				ParentDepartmentID string `json:"parent_department_id"`
			} `json:"items"`
			PageToken string `json:"page_token"`
			HasMore   bool   `json:"has_more"`
		}
		if err := common.Unmarshal(r.Data, &data); err != nil {
			return cache, fmt.Errorf("decode departments: %w", err)
		}
		for _, d := range data.Items {
			cache[d.OpenDepartmentID] = feishuDepartment{Name: d.Name, ParentDepartmentID: d.ParentDepartmentID}
		}
		if !data.HasMore || data.PageToken == "" {
			break
		}
		pageToken = data.PageToken
	}
	return cache, nil
}

// buildDeptPath 返回从根到该部门的部门名列表。
func buildDeptPath(deptID string, cache map[string]feishuDepartment) []string {
	var names []string
	current := deptID
	visited := map[string]bool{}
	for current != "" && current != "0" && !visited[current] {
		visited[current] = true
		dept, ok := cache[current]
		if !ok {
			break
		}
		names = append([]string{dept.Name}, names...)
		current = dept.ParentDepartmentID
	}
	return names
}

func jsonStringArray(arr []string) string {
	data, err := common.Marshal(arr)
	if err != nil {
		return "[]"
	}
	return string(data)
}

// buildFeishuSummary 组装要写回数据库的字段汇总。
func buildFeishuSummary(info *feishuUserInfo, openID, empNo string, deptCache map[string]feishuDepartment) feishuSyncSummary {
	s := feishuSyncSummary{
		AvatarUrl:      info.Avatar.Avatar240,
		OpenId:         openID,
		DisplayName:    info.Name,
		DepartmentIds:  jsonStringArray(info.DepartmentIDs),
		EmployeeNumber: empNo,
	}

	// 部门路径：每个部门解析为从根到叶的名称链，整体存为 JSON 数组（每项一个名称数组），
	// 与 feishu-sync 的 department_path 结构一致。无部门缓存时退化为 id 数组。
	if len(deptCache) > 0 && len(info.DepartmentIDs) > 0 {
		paths := make([][]string, 0, len(info.DepartmentIDs))
		for _, deptID := range info.DepartmentIDs {
			paths = append(paths, buildDeptPath(deptID, deptCache))
		}
		if data, err := common.Marshal(paths); err == nil {
			s.DepartmentPath = string(data)
		} else {
			s.DepartmentPath = s.DepartmentIds
		}
	} else {
		s.DepartmentPath = s.DepartmentIds
	}

	// is_dept_leader：飞书 leader_user_id 指向本人 open_id 表示该用户是其所在部门负责人。
	if info.LeaderUserID != "" && info.LeaderUserID == openID {
		s.IsDeptLeader = true
	}
	return s
}

// applyFeishuSummary 将汇总字段写回用户记录。
func applyFeishuSummary(userID int, s feishuSyncSummary) error {
	updates := map[string]any{
		"avatar_url":        s.AvatarUrl,
		"open_id":           s.OpenId,
		"display_name":      s.DisplayName,
		"department_ids":    s.DepartmentIds,
		"department_path":   s.DepartmentPath,
		"is_dept_leader":    s.IsDeptLeader,
		"leader_dept_level": s.LeaderDeptLevel,
		"employee_number":   s.EmployeeNumber,
	}
	if err := model.DB.Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return err
	}
	common.SysLog(fmt.Sprintf("飞书字段同步完成 user_id=%d open_id=%s emp_no=%s", userID, s.OpenId, s.EmployeeNumber))
	return nil
}
