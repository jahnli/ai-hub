package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupReportNotifyScopeTest(t *testing.T) *model.Company {
	t.Helper()
	previousDB := model.DB
	previousDirectoryFetcher := fetchCompanyDirectory
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}))
	model.DB = db
	company := &model.Company{
		Name: "测试公司", Alias: "测试公司别名", Platform: model.CompanyPlatformFeishu,
		Status: model.CompanyStatusEnabled, SortOrder: 1, Config: "{}",
	}
	require.NoError(t, db.Create(company).Error)
	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "center", ParentID: "0", Name: "数智产品中心"},
				{ID: "bu", ParentID: "center", Name: "AI应用技术部"},
				{ID: "team", ParentID: "bu", Name: "AI工程效率科"},
			},
		}, nil
	}
	t.Cleanup(func() {
		model.DB = previousDB
		fetchCompanyDirectory = previousDirectoryFetcher
		_ = sqlDB.Close()
	})
	return company
}

func TestGetReportNotifyScopesMatchesBUBPDataOverviewScope(t *testing.T) {
	company := setupReportNotifyScopeTest(t)
	user := &model.User{
		Role: common.RoleBUBP, Company: company.Name,
		DepartmentName: "数智产品中心 / AI应用技术部 / AI工程效率科",
	}

	scopes, err := getReportNotifyScopes(user)

	require.NoError(t, err)
	require.Len(t, scopes, 1)
	assert.Equal(t, departmentNodeValue(company.Id, "bu"), scopes[0].departmentID)
	assert.Equal(t, "数智产品中心 / AI应用技术部", scopes[0].departmentName)
}

func TestGetReportNotifyScopesMatchesLeaderDataOverviewScopes(t *testing.T) {
	company := setupReportNotifyScopeTest(t)
	user := &model.User{
		Role: common.RoleCommonUser, Company: company.Name, OpenId: "ou_leader",
		Departments: `[{"department_id":"team","leaders":[{"leader_id":"ou_leader"}]}]`,
	}

	scopes, err := getReportNotifyScopes(user)

	require.NoError(t, err)
	require.Len(t, scopes, 1)
	assert.Equal(t, departmentNodeValue(company.Id, "team"), scopes[0].departmentID)
	assert.Equal(t, "数智产品中心 / AI应用技术部 / AI工程效率科", scopes[0].departmentName)
}

func TestGetReportNotifyScopesUsesCompanyRootForRootUser(t *testing.T) {
	company := setupReportNotifyScopeTest(t)

	scopes, err := getReportNotifyScopes(&model.User{Role: common.RoleRootUser})

	require.NoError(t, err)
	require.Len(t, scopes, 1)
	assert.Equal(t, companyNodeValue(company.Id), scopes[0].departmentID)
	assert.Equal(t, company.Alias, scopes[0].departmentName)
}

func TestGetReportNotifyUserReportsUsesDataOverviewStats(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousQuotaPerUnit := common.QuotaPerUnit
	previousExchangeRate := operation_setting.USDExchangeRate
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}, &model.QuotaData{}, &model.Log{}))
	model.DB, model.LOG_DB = db, db
	common.QuotaPerUnit = 500_000
	operation_setting.USDExchangeRate = 7.3
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.QuotaPerUnit = previousQuotaPerUnit
		operation_setting.USDExchangeRate = previousExchangeRate
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name: "无目录公司", Alias: "无目录公司别名", Platform: model.CompanyPlatformNone,
		Status: model.CompanyStatusEnabled, SortOrder: 1, Config: "{}",
	}
	require.NoError(t, db.Create(company).Error)
	root := &model.User{
		Username: "report-root", Password: "password", Role: common.RoleRootUser,
		Status: common.UserStatusEnabled, OpenId: "ou_report_root", CreatedAt: 1,
	}
	member := &model.User{
		Username: "report-member", Password: "password", Role: common.RoleCommonUser,
		Status: common.UserStatusEnabled, Company: company.Name, OpenId: "ou_member", CreatedAt: 1,
	}
	require.NoError(t, db.Create(root).Error)
	require.NoError(t, db.Create(member).Error)
	require.NoError(t, db.Create(&model.QuotaData{
		UserID: member.Id, Username: member.Username, ModelName: "test-model", CreatedAt: 150,
		TokenUsed: 2_000_000, UncachedInputTokens: 1_000_000, UncachedOutputTokens: 500_000,
		CacheReadTokens: 400_000, CacheWriteTokens: 100_000, Count: 15, Quota: 500_000,
	}).Error)
	require.NoError(t, db.Create(&model.Log{
		UserId: member.Id, Username: member.Username, Type: model.LogTypeConsume, CreatedAt: 150, UseTime: 30,
	}).Error)

	response, err := GetReportNotifyUserReports(&ReportNotifyUserReportsRequest{
		UserID: root.Id, StartTimestamp: 100, EndTimestamp: 200,
	})

	require.NoError(t, err)
	assert.Equal(t, root.OpenId, response.RecipientOpenID)
	require.Len(t, response.Reports, 1)
	report := response.Reports[0]
	assert.Equal(t, companyNodeValue(company.Id), report.DepartmentID)
	assert.Equal(t, company.Alias, report.DepartmentName)
	require.NotNil(t, report.Stats)
	assert.Equal(t, int64(2_000_000), report.Stats.TotalTokens)
	assert.Equal(t, int64(1), report.Stats.RegisteredUsers)
	assert.Equal(t, int64(1), report.Stats.ActiveUsers)
	assert.InDelta(t, 7.3, report.Stats.TotalAmountCNY, 0.0001)
	assert.Empty(t, report.SubStats)
}
