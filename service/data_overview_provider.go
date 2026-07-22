package service

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"golang.org/x/sync/singleflight"
)

type overviewDepartment struct {
	ID           string
	ParentID     string
	Name         string
	LeaderUserID string
}

type overviewDirectory struct {
	OrganizationName string
	Departments      []overviewDepartment
}

type overviewMember struct {
	OpenID string
	Name   string
}

type companyOverviewCacheEntry struct {
	value     any
	expiresAt time.Time
}

var companyOverviewCache sync.Map
var companyOverviewSingleflight singleflight.Group

func companyOverviewCacheKey(companyID int, resource string, rawID string) string {
	return fmt.Sprintf("company:%d:%s:%s", companyID, resource, rawID)
}

func loadCompanyOverviewCache(key string) (any, bool) {
	value, ok := companyOverviewCache.Load(key)
	if !ok {
		return nil, false
	}
	entry := value.(companyOverviewCacheEntry)
	if time.Now().After(entry.expiresAt) {
		companyOverviewCache.Delete(key)
		return nil, false
	}
	return entry.value, true
}

func storeCompanyOverviewCache(key string, value any, ttl time.Duration) {
	companyOverviewCache.Store(key, companyOverviewCacheEntry{value: value, expiresAt: time.Now().Add(ttl)})
}

func InvalidateCompanyOverviewCache(companyID int) {
	prefix := fmt.Sprintf("company:%d:", companyID)
	companyOverviewCache.Range(func(key, _ any) bool {
		cacheKey, ok := key.(string)
		if ok && strings.HasPrefix(cacheKey, prefix) {
			companyOverviewCache.Delete(cacheKey)
			companyOverviewSingleflight.Forget(cacheKey)
		}
		return true
	})
}

var fetchCompanyDirectory = fetchCompanyDirectoryFromProvider
var fetchCompanyMembers = fetchCompanyMembersFromProvider

func fetchCompanyDirectoryFromProvider(company *model.Company) (*overviewDirectory, error) {
	cacheKey := companyOverviewCacheKey(company.Id, "directory", "")
	if cached, ok := loadCompanyOverviewCache(cacheKey); ok {
		return cached.(*overviewDirectory), nil
	}
	value, err, _ := companyOverviewSingleflight.Do(cacheKey, func() (any, error) {
		config, err := company.GetConfig()
		if err != nil {
			return nil, err
		}
		var directory *overviewDirectory
		switch company.Platform {
		case model.CompanyPlatformFeishu:
			directory, err = fetchFeishuCompanyDirectory(company, config.Feishu)
		case model.CompanyPlatformDingTalk:
			directory, err = fetchDingTalkCompanyDirectory(company, config.DingTalk)
		default:
			return &overviewDirectory{OrganizationName: company.Name}, nil
		}
		if err != nil {
			return nil, err
		}
		storeCompanyOverviewCache(cacheKey, directory, departmentCacheTTL)
		return directory, nil
	})
	if err != nil {
		return nil, err
	}
	return value.(*overviewDirectory), nil
}

func fetchCompanyMembersFromProvider(company *model.Company, departmentID string) ([]overviewMember, error) {
	cacheKey := companyOverviewCacheKey(company.Id, "members", departmentID)
	if cached, ok := loadCompanyOverviewCache(cacheKey); ok {
		return cached.([]overviewMember), nil
	}
	value, err, _ := companyOverviewSingleflight.Do(cacheKey, func() (any, error) {
		config, err := company.GetConfig()
		if err != nil {
			return nil, err
		}
		var members []overviewMember
		switch company.Platform {
		case model.CompanyPlatformFeishu:
			token, err := getCompanyFeishuToken(company.Id, config.Feishu)
			if err != nil {
				return nil, err
			}
			items, err := fetchDepartmentMemberDetails(token, departmentID)
			if err != nil {
				return nil, err
			}
			members = make([]overviewMember, 0, len(items))
			for _, item := range items {
				members = append(members, overviewMember{OpenID: item.OpenID, Name: item.Name})
			}
		case model.CompanyPlatformDingTalk:
			token, err := getCompanyDingTalkToken(company.Id, config.DingTalk)
			if err != nil {
				return nil, err
			}
			members, err = dingtalkFetchDepartmentMembers(
				config.DingTalk.ClientID,
				token,
				departmentID,
			)
			if err != nil {
				return nil, err
			}
		}
		storeCompanyOverviewCache(cacheKey, members, departmentMemberCacheTTL)
		return members, nil
	})
	if err != nil {
		return nil, err
	}
	return value.([]overviewMember), nil
}

func getCompanyFeishuToken(companyID int, config model.CompanyFeishuConfig) (string, error) {
	if config.AppID == "" || config.AppSecret == "" {
		return "", fmt.Errorf("company %d feishu credentials are incomplete", companyID)
	}
	cacheKey := companyOverviewCacheKey(companyID, "feishu-token", "")
	if cached, ok := loadCompanyOverviewCache(cacheKey); ok {
		return cached.(string), nil
	}
	token, err := feishuGetTenantAccessToken(feishuSyncConfig{AppID: config.AppID, AppSecret: config.AppSecret})
	if err != nil {
		return "", err
	}
	storeCompanyOverviewCache(cacheKey, token, time.Hour)
	return token, nil
}

func fetchFeishuCompanyDirectory(company *model.Company, config model.CompanyFeishuConfig) (*overviewDirectory, error) {
	token, err := getCompanyFeishuToken(company.Id, config)
	if err != nil {
		return nil, err
	}
	tenant, err := feishuFetchTenantInfo(token)
	if err != nil {
		return nil, err
	}
	departments, err := feishuFetchAllDepartments(token)
	if err != nil {
		return nil, err
	}
	result := &overviewDirectory{OrganizationName: tenant.Name, Departments: make([]overviewDepartment, 0, len(departments))}
	for _, department := range departments {
		result.Departments = append(result.Departments, overviewDepartment{
			ID:           department.OpenDepartmentID,
			ParentID:     department.ParentDepartmentID,
			Name:         department.Name,
			LeaderUserID: department.LeaderUserID,
		})
	}
	return result, nil
}

func getCompanyDingTalkToken(companyID int, config model.CompanyDingTalkConfig) (string, error) {
	if config.ClientID == "" || config.ClientSecret == "" {
		return "", fmt.Errorf("company %d dingtalk credentials are incomplete", companyID)
	}
	cacheKey := companyOverviewCacheKey(companyID, "dingtalk-token", "")
	if cached, ok := loadCompanyOverviewCache(cacheKey); ok {
		return cached.(string), nil
	}
	token, err := dingtalkGetAccessToken(dingtalkSyncConfig{ClientID: config.ClientID, ClientSecret: config.ClientSecret})
	if err != nil {
		return "", err
	}
	storeCompanyOverviewCache(cacheKey, token, time.Hour)
	return token, nil
}

func fetchDingTalkCompanyDirectory(company *model.Company, config model.CompanyDingTalkConfig) (*overviewDirectory, error) {
	token, err := getCompanyDingTalkToken(company.Id, config)
	if err != nil {
		return nil, err
	}
	root, err := dingtalkFetchDeptDetail(token, dingTalkDeptRootID, make(map[int64]*dingtalkDeptDetail))
	if err != nil {
		return nil, err
	}
	departments, err := dingtalkFetchAllDepartments(token)
	if err != nil {
		return nil, err
	}
	return &overviewDirectory{OrganizationName: root.Name, Departments: departments}, nil
}

func dingtalkFetchAllDepartments(token string) ([]overviewDepartment, error) {
	result := make([]overviewDepartment, 0)
	queue := []int64{dingTalkDeptRootID}
	seen := map[int64]bool{dingTalkDeptRootID: true}
	for len(queue) > 0 {
		parentID := queue[0]
		queue = queue[1:]
		urlValue := fmt.Sprintf("%s/topapi/v2/department/listsub?access_token=%s", dingTalkBaseURL, url.QueryEscape(token))
		body := map[string]any{"dept_id": parentID, "language": "zh_CN"}
		respBody, status, err := dingtalkDoRequest(http.MethodPost, urlValue, body)
		if err != nil {
			return nil, errors.New("dingtalk department request failed")
		}
		if status != http.StatusOK {
			return nil, fmt.Errorf("http %d: %s", status, string(respBody))
		}
		var response struct {
			Errcode int    `json:"errcode"`
			Errmsg  string `json:"errmsg"`
			Result  []struct {
				DeptID   int64  `json:"dept_id"`
				Name     string `json:"name"`
				ParentID int64  `json:"parent_id"`
			} `json:"result"`
		}
		if err := common.Unmarshal(respBody, &response); err != nil {
			return nil, err
		}
		if response.Errcode != 0 {
			return nil, fmt.Errorf("dingtalk errcode=%d msg=%s", response.Errcode, response.Errmsg)
		}
		for _, department := range response.Result {
			if seen[department.DeptID] {
				continue
			}
			seen[department.DeptID] = true
			queue = append(queue, department.DeptID)
			result = append(result, overviewDepartment{
				ID:       strconv.FormatInt(department.DeptID, 10),
				ParentID: strconv.FormatInt(department.ParentID, 10),
				Name:     department.Name,
			})
		}
	}
	return result, nil
}

func dingtalkFetchDepartmentMembers(clientID string, token string, departmentID string) ([]overviewMember, error) {
	deptID, err := strconv.ParseInt(departmentID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid dingtalk department id %q", departmentID)
	}
	cursor := int64(0)
	result := make([]overviewMember, 0)
	for {
		urlValue := fmt.Sprintf("%s/topapi/v2/user/list?access_token=%s", dingTalkBaseURL, url.QueryEscape(token))
		body := map[string]any{"dept_id": deptID, "cursor": cursor, "size": 100, "order_field": "entry_asc"}
		respBody, status, err := executeDingTalkRateLimitedRequest(
			func() { waitForDingTalkMemberListRequest(clientID) },
			time.Sleep,
			func() ([]byte, int, error) {
				return dingtalkDoRequest(http.MethodPost, urlValue, body)
			},
		)
		if err != nil {
			return nil, errors.New("dingtalk member request failed")
		}
		if status != http.StatusOK {
			return nil, fmt.Errorf("dingtalk member request returned http %d", status)
		}
		var response struct {
			Errcode int    `json:"errcode"`
			Errmsg  string `json:"errmsg"`
			Result  struct {
				HasMore    bool  `json:"has_more"`
				NextCursor int64 `json:"next_cursor"`
				List       []struct {
					UserID string `json:"userid"`
					Name   string `json:"name"`
				} `json:"list"`
			} `json:"result"`
		}
		if err := common.Unmarshal(respBody, &response); err != nil {
			return nil, err
		}
		if response.Errcode != 0 {
			return nil, fmt.Errorf("dingtalk member errcode=%d", response.Errcode)
		}
		for _, member := range response.Result.List {
			if member.UserID != "" {
				result = append(result, overviewMember{OpenID: member.UserID, Name: member.Name})
			}
		}
		if !response.Result.HasMore {
			return result, nil
		}
		cursor = response.Result.NextCursor
	}
}
