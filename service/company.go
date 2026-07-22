package service

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/model"
)

type CompanyConnectionTestResult struct {
	Connected        bool   `json:"connected"`
	Platform         string `json:"platform"`
	OrganizationName string `json:"organization_name,omitempty"`
	NameMatched      *bool  `json:"name_matched,omitempty"`
	Message          string `json:"message"`
}

func TestCompanyConnection(company *model.Company) (*CompanyConnectionTestResult, error) {
	if company == nil {
		return nil, errors.New("company is required")
	}
	config, err := company.GetConfig()
	if err != nil {
		return nil, err
	}

	switch company.Platform {
	case model.CompanyPlatformNone:
		return &CompanyConnectionTestResult{
			Connected: true,
			Platform:  model.CompanyPlatformNone,
			Message:   "无需测试外部平台连接，公司配置有效",
		}, nil
	case model.CompanyPlatformFeishu:
		if config.Feishu.AppID == "" || config.Feishu.AppSecret == "" {
			return nil, errors.New("飞书 app_id 和 app_secret 未完整配置")
		}
		token, err := feishuGetTenantAccessToken(feishuSyncConfig{
			AppID:     config.Feishu.AppID,
			AppSecret: config.Feishu.AppSecret,
		})
		if err != nil {
			return nil, fmt.Errorf("飞书连接失败: %w", err)
		}
		tenant, err := feishuFetchTenantInfo(token)
		if err != nil {
			return nil, fmt.Errorf("飞书租户信息获取失败: %w", err)
		}
		matched := tenant.Name == company.Name
		message := "飞书连接成功，公司名称与租户名称一致"
		if !matched {
			message = "飞书连接成功，但公司名称与租户名称不一致"
		}
		return &CompanyConnectionTestResult{
			Connected:        true,
			Platform:         model.CompanyPlatformFeishu,
			OrganizationName: tenant.Name,
			NameMatched:      &matched,
			Message:          message,
		}, nil
	case model.CompanyPlatformDingTalk:
		if config.DingTalk.ClientID == "" || config.DingTalk.ClientSecret == "" {
			return nil, errors.New("钉钉 client_id 和 client_secret 未完整配置")
		}
		token, _, err := dingtalkFetchNewToken(config.DingTalk.ClientID, config.DingTalk.ClientSecret)
		if err != nil {
			return nil, fmt.Errorf("钉钉连接失败: %w", err)
		}
		rootDepartment, err := dingtalkFetchDeptDetail(token, dingTalkDeptRootID, make(map[int64]*dingtalkDeptDetail))
		if err != nil {
			return nil, fmt.Errorf("钉钉根部门信息获取失败: %w", err)
		}
		matched := rootDepartment.Name == company.Name
		message := "钉钉连接成功，公司名称与根部门名称一致"
		if !matched {
			message = "钉钉连接成功，但公司名称与根部门名称不一致"
		}
		return &CompanyConnectionTestResult{
			Connected:        true,
			Platform:         model.CompanyPlatformDingTalk,
			OrganizationName: rootDepartment.Name,
			NameMatched:      &matched,
			Message:          message,
		}, nil
	default:
		return nil, errors.New("不支持的公司平台")
	}
}
