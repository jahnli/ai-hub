package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/model"
)

const (
	feishuEmailSuffix = "@semi-tech.com"
	feishuAvatarSize  = "avatar_240"
)

type feishuBatchGetIdResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		UserList []struct {
			Email  string `json:"email"`
			UserId string `json:"user_id"`
		} `json:"user_list"`
	} `json:"data"`
}

type feishuUserInfoResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		User struct {
			OpenId        string            `json:"open_id"`
			UnionId       string            `json:"union_id"`
			UserId        string            `json:"user_id"`
			Name          string            `json:"name"`
			EnName        string            `json:"en_name"`
			Email         string            `json:"email"`
			Description   string            `json:"description"`
			LeaderUserId  string            `json:"leader_user_id"`
			DepartmentIds []string          `json:"department_ids"`
			Avatar        map[string]string `json:"avatar"`
		} `json:"user"`
	} `json:"data"`
}

// FeishuSyncedUser holds the subset of Feishu user info we persist on the User model.
type FeishuSyncedUser struct {
	AvatarUrl      string
	OpenId         string
	UnionId        string
	UserId         string
	Name           string
	EnName         string
	Email          string
	Description    string
	LeaderUserId   string
	DepartmentIds  string // JSON-encoded []string
	DepartmentPath string // JSON-encoded path structure
}

func batchGetIdByEmails(tenantToken string, emails []string) (map[string]string, error) {
	body, err := json.Marshal(map[string]interface{}{
		"emails":           emails,
		"include_resigned": false,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST",
		"https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id",
		bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tenantToken)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request batch_get_id failed: %w", err)
	}
	defer res.Body.Close()

	var resp feishuBatchGetIdResponse
	if err = json.NewDecoder(res.Body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("decode batch_get_id response failed: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("batch_get_id error: code=%d, msg=%s", resp.Code, resp.Msg)
	}
	result := make(map[string]string, len(resp.Data.UserList))
	for _, u := range resp.Data.UserList {
		if u.Email != "" && u.UserId != "" {
			result[u.Email] = u.UserId
		}
	}
	return result, nil
}

// fetchFeishuUserInfo retrieves the full user record by open_id.
func fetchFeishuUserInfo(tenantToken, openId string) (*feishuUserInfoResponse, error) {
	url := fmt.Sprintf(
		"https://open.feishu.cn/open-apis/contact/v3/users/%s?user_id_type=open_id&department_id_type=open_department_id",
		openId,
	)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tenantToken)

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request user info failed: %w", err)
	}
	defer res.Body.Close()

	var resp feishuUserInfoResponse
	if err = json.NewDecoder(res.Body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("decode user info response failed: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("get user info error: code=%d, msg=%s", resp.Code, resp.Msg)
	}
	return &resp, nil
}

type deptPathName struct {
	Name     string `json:"name"`
	I18nName struct {
		ZhCn string `json:"zh_cn"`
		EnUs string `json:"en_us"`
		JaJp string `json:"ja_jp"`
	} `json:"i18n_name"`
}

type deptPathEntry struct {
	DepartmentId   string `json:"department_id"`
	DepartmentName struct {
		Name     string `json:"name"`
		I18nName struct {
			ZhCn string `json:"zh_cn"`
			EnUs string `json:"en_us"`
			JaJp string `json:"ja_jp"`
		} `json:"i18n_name"`
	} `json:"department_name"`
	DepartmentPath struct {
		DepartmentIds       []string     `json:"department_ids"`
		DepartmentPathName  deptPathName `json:"department_path_name"`
	} `json:"department_path"`
}

func buildDeptPath(departmentId string, deptMap map[string]*FeishuDepartment) deptPathEntry {
	var pathIds []string
	var pathNames []string

	currentId := departmentId
	for currentId != "" && currentId != "0" {
		dept, ok := deptMap[currentId]
		if !ok {
			break
		}
		pathIds = append([]string{dept.DepartmentId}, pathIds...)
		pathNames = append([]string{dept.GetName()}, pathNames...)
		currentId = dept.ParentDepartmentId
	}

	leaf := deptMap[departmentId]
	entry := deptPathEntry{DepartmentId: departmentId}
	if leaf != nil {
		entry.DepartmentName.Name = leaf.GetName()
		if leaf.I18nName != nil {
			entry.DepartmentName.I18nName.ZhCn = leaf.I18nName.ZhCn
			entry.DepartmentName.I18nName.EnUs = leaf.I18nName.EnUs
		}
		if entry.DepartmentName.I18nName.ZhCn == "" {
			entry.DepartmentName.I18nName.ZhCn = leaf.GetName()
		}
	}
	entry.DepartmentPath.DepartmentIds = pathIds
	joined := joinStrings(pathNames, "-")
	entry.DepartmentPath.DepartmentPathName.Name = joined
	entry.DepartmentPath.DepartmentPathName.I18nName.ZhCn = joined
	return entry
}

func joinStrings(parts []string, sep string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += sep
		}
		out += p
	}
	return out
}

// SyncFeishuUserByUsername resolves the Feishu profile for username + email suffix
// and returns the data to populate on a new user record. Returns nil if the user
// cannot be found in Feishu; callers should treat that as non-fatal.
func SyncFeishuUserByUsername(username string) (*FeishuSyncedUser, error) {
	if username == "" {
		return nil, fmt.Errorf("username is empty")
	}

	token, err := GetTenantAccessToken()
	if err != nil {
		return nil, fmt.Errorf("get tenant token: %w", err)
	}

	primary := username + feishuEmailSuffix
	idMap, err := batchGetIdByEmails(token, []string{primary})
	if err != nil {
		return nil, err
	}
	openId := idMap[primary]
	matchedEmail := primary

	if openId == "" {
		lowered := toLower(username) + feishuEmailSuffix
		if lowered != primary {
			retry, err := batchGetIdByEmails(token, []string{lowered})
			if err != nil {
				return nil, err
			}
			openId = retry[lowered]
			matchedEmail = lowered
		}
	}

	if openId == "" {
		return nil, nil
	}

	info, err := fetchFeishuUserInfo(token, openId)
	if err != nil {
		return nil, err
	}
	u := info.Data.User

	synced := &FeishuSyncedUser{
		OpenId:       u.OpenId,
		UnionId:      u.UnionId,
		UserId:       u.UserId,
		Name:         u.Name,
		EnName:       u.EnName,
		Email:        u.Email,
		Description:  u.Description,
		LeaderUserId: u.LeaderUserId,
	}
	if synced.Email == "" {
		synced.Email = matchedEmail
	}
	if u.Avatar != nil {
		if url, ok := u.Avatar[feishuAvatarSize]; ok {
			synced.AvatarUrl = url
		}
	}

	if deptBytes, err := json.Marshal(u.DepartmentIds); err == nil {
		synced.DepartmentIds = string(deptBytes)
	}

	if len(u.DepartmentIds) > 0 {
		depts, err := FetchAllDepartments(token)
		if err == nil {
			deptMap := make(map[string]*FeishuDepartment, len(depts))
			for _, d := range depts {
				deptMap[d.DepartmentId] = d
			}
			pathList := make([]deptPathEntry, 0, len(u.DepartmentIds))
			for _, did := range u.DepartmentIds {
				pathList = append(pathList, buildDeptPath(did, deptMap))
			}
			if b, err := json.Marshal(pathList); err == nil {
				synced.DepartmentPath = string(b)
			}
		}
	}

	return synced, nil
}

// ApplyFeishuSyncToUser copies the Feishu-derived fields onto a User struct
// without overriding fields the caller has explicitly set.
func ApplyFeishuSyncToUser(user *model.User, synced *FeishuSyncedUser) {
	if synced == nil || user == nil {
		return
	}
	user.AvatarUrl = synced.AvatarUrl
	user.OpenId = synced.OpenId
	user.EnName = synced.EnName
	user.Name = synced.Name
	user.Description = synced.Description
	user.UserIdStr = synced.UserId
	user.LeaderUserId = synced.LeaderUserId
	user.DepartmentIds = synced.DepartmentIds
	user.DepartmentPath = synced.DepartmentPath
	if user.Email == "" && synced.Email != "" {
		user.Email = synced.Email
	}
	if synced.Name != "" && user.DisplayName == user.Username {
		user.DisplayName = synced.Name
	}
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}
