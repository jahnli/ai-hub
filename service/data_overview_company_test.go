package service

import (
	"fmt"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestOverviewDepartmentBelongsToCompany(t *testing.T) {
	tests := []struct {
		name           string
		departmentIDs  []string
		companyID      int
		wantAccessible bool
	}{
		{
			name:           "matches configured company prefix",
			departmentIDs:  []string{"dept:2:department-a"},
			companyID:      2,
			wantAccessible: true,
		},
		{
			name:           "does not match another company",
			departmentIDs:  []string{"dept:2:department-a"},
			companyID:      3,
			wantAccessible: false,
		},
		{
			name:           "ignores empty and duplicate values",
			departmentIDs:  []string{"", "dept:2:department-a", "dept:2:department-a"},
			companyID:      2,
			wantAccessible: true,
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantAccessible, overviewDepartmentBelongsToCompany(testCase.departmentIDs, testCase.companyID))
		})
	}
}

func TestGetDepartmentTreeReturnsEmptyWhenNoCompaniesExist(t *testing.T) {
	previousDB := model.DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		_ = sqlDB.Close()
	})

	response, err := GetDepartmentTree(999, common.RoleRootUser)

	require.NoError(t, err)
	require.NotNil(t, response)
	assert.Empty(t, response.TreeData)
	assert.Empty(t, response.LeaderDeptIDs)
}

func TestFinalizeDepartmentStatCalculatesUnitPricePerHundredMillionTokens(t *testing.T) {
	previousQuotaPerUnit := common.QuotaPerUnit
	previousExchangeRate := operation_setting.USDExchangeRate
	common.QuotaPerUnit = 500_000
	operation_setting.USDExchangeRate = 1
	t.Cleanup(func() {
		common.QuotaPerUnit = previousQuotaPerUnit
		operation_setting.USDExchangeRate = previousExchangeRate
	})

	stat := &model.DepartmentStat{
		TotalTokens: 100_000_000,
		TotalQuota:  145_000,
	}

	finalizeDepartmentStat(stat)

	assert.InDelta(t, 0.29, stat.TotalAmountCNY, 0.000001)
	assert.InDelta(t, 0.29, stat.UnitPricePer100MTokens, 0.000001)
}

func TestGetDepartmentOverviewReturnsCompleteEmptyCompanySnapshot(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	require.NoError(t, db.AutoMigrate(
		&model.Company{},
		&model.User{},
		&model.QuotaData{},
		&model.Log{},
	))
	model.DB = db
	model.LOG_DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:      "overview-company",
		Alias:     "Overview Company",
		Platform:  model.CompanyPlatformNone,
		Status:    model.CompanyStatusEnabled,
		SortOrder: 1,
		Config:    "{}",
	}
	require.NoError(t, db.Create(company).Error)
	var userQueryCount atomic.Int32
	const callbackName = "test:count_overview_user_queries"
	require.NoError(t, db.Callback().Query().Before("gorm:query").Register(callbackName, func(tx *gorm.DB) {
		if tx.Statement != nil && tx.Statement.Table == "users" {
			userQueryCount.Add(1)
		}
	}))
	t.Cleanup(func() { _ = db.Callback().Query().Remove(callbackName) })

	response, err := GetDepartmentOverview(&DepartmentOverviewRequest{
		CompanyID:           company.Id,
		DepartmentID:        companyNodeValue(company.Id),
		StartTimestamp:      1_700_000_000,
		EndTimestamp:        1_700_086_400,
		Page:                1,
		PageSize:            10,
		SortBy:              "sub_quota_used",
		SortOrder:           "desc",
		IncludeUnregistered: true,
		RequestUserID:       1,
		RequestUserRole:     common.RoleRootUser,
	})

	require.NoError(t, err)
	require.NotNil(t, response)
	require.NotNil(t, response.Stats)
	require.NotNil(t, response.Usage)
	require.NotNil(t, response.Users)
	assert.Empty(t, response.SubStats)
	assert.Empty(t, response.UserRankings)
	assert.Empty(t, response.Users.Items)
	assert.Zero(t, response.Users.Total)
	assert.Equal(t, 1, response.Users.Page)
	assert.Equal(t, 10, response.Users.Size)
	assert.Equal(t, int32(1), userQueryCount.Load())
}

func TestPartitionMatchedMembersByPrimaryDepartmentBucketsChildSubtrees(t *testing.T) {
	directory := &overviewDirectory{
		OrganizationName: "partition-company",
		Departments: []overviewDepartment{
			{ID: "child-a", ParentID: "0", Name: "Child A"},
			{ID: "child-a-1", ParentID: "child-a", Name: "Child A1"},
			{ID: "child-b", ParentID: "0", Name: "Child B"},
		},
	}
	children := []overviewDepartment{
		{ID: "child-a", ParentID: "0", Name: "Child A"},
		{ID: "child-b", ParentID: "0", Name: "Child B"},
	}
	users := []*model.User{
		{
			Id:          1,
			OpenId:      "user-a",
			Departments: `[{"department_id":"child-a-1"}]`,
		},
		{
			Id:          2,
			OpenId:      "user-b",
			Departments: `[{"department_id":"child-b"}]`,
		},
	}
	members := []overviewMember{
		{OpenID: "user-a"},
		{OpenID: "user-b"},
		{OpenID: "unregistered-a", ObservedDepartmentID: "child-a-1"},
		{OpenID: "unregistered-b", ObservedDepartmentID: "child-b"},
		{OpenID: "unregistered-root", ObservedDepartmentID: "0"},
	}

	childMembers, childUsers := partitionMatchedMembersByPrimaryDepartment(
		members,
		users,
		directory,
		children,
		model.CompanyPlatformFeishu,
	)

	require.Len(t, childMembers, 2)
	require.Len(t, childUsers, 2)
	assert.Equal(t, []overviewMember{
		{OpenID: "user-a"},
		{OpenID: "unregistered-a", ObservedDepartmentID: "child-a-1"},
	}, childMembers[0])
	assert.Equal(t, []overviewMember{
		{OpenID: "user-b"},
		{OpenID: "unregistered-b", ObservedDepartmentID: "child-b"},
	}, childMembers[1])
	require.Len(t, childUsers[0], 1)
	assert.Equal(t, "user-a", childUsers[0][0].OpenId)
	require.Len(t, childUsers[1], 1)
	assert.Equal(t, "user-b", childUsers[1][0].OpenId)
}

func TestResolveCompanyOverviewAudienceSharesSingleMemberFetch(t *testing.T) {
	previousDB := model.DB
	previousDirectoryFetcher, previousMemberFetcher := fetchCompanyDirectory, fetchCompanyMembers
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		InvalidateCompanyOverviewCache(1)
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Id:       1,
		Name:     "audience-share-company",
		Platform: model.CompanyPlatformFeishu,
		Status:   model.CompanyStatusEnabled,
		Config:   "{}",
	}
	require.NoError(t, db.Create(company).Error)
	require.NoError(t, db.Create(&model.User{
		Username:    "audience-share-user",
		Password:    "password",
		Company:     company.Name,
		OpenId:      "open-id-1",
		Departments: `[{"department_id":"department-1"}]`,
		CreatedAt:   100,
	}).Error)

	var memberFetchCount atomic.Int32
	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "department-1", ParentID: "0", Name: "Department 1"},
			},
		}, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		memberFetchCount.Add(1)
		if departmentID == "department-1" {
			return []overviewMember{{OpenID: "open-id-1"}}, nil
		}
		return []overviewMember{}, nil
	}

	departmentValue := companyNodeValue(company.Id)
	first, _, err := resolveCompanyOverviewAudience(company.Id, departmentValue, 1, common.RoleRootUser, 200)
	require.NoError(t, err)
	require.NotNil(t, first)
	firstFetchCount := memberFetchCount.Load()
	require.Greater(t, firstFetchCount, int32(0))

	second, _, err := resolveCompanyOverviewAudience(company.Id, departmentValue, 1, common.RoleRootUser, 200)
	require.NoError(t, err)
	require.NotNil(t, second)
	assert.Equal(t, firstFetchCount, memberFetchCount.Load(), "second resolve should reuse audience cache")
	assert.Equal(t, first.totalUsers, second.totalUsers)
	assert.Equal(t, len(first.registeredUserIDs), len(second.registeredUserIDs))
}

func TestBuildCompanyDepartmentUsersEnrichesOnlyCurrentPageDetails(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousDirectoryFetcher := fetchCompanyDirectory
	previousMemberFetcher := fetchCompanyMembers
	previousDetailsFetcher := fetchCompanyMemberDetails
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}, &model.QuotaData{}, &model.UserSubscription{}))
	model.DB = db
	model.LOG_DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		fetchCompanyMemberDetails = previousDetailsFetcher
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:     "page-lazy-company",
		Platform: model.CompanyPlatformFeishu,
		Status:   model.CompanyStatusEnabled,
		Config:   "{}",
	}
	require.NoError(t, db.Create(company).Error)
	registered := &model.User{
		Username:    "page-lazy-registered",
		Password:    "password",
		DisplayName: "Registered User",
		Company:     company.Name,
		OpenId:      "open-registered",
		Departments: `[{"department_id":"department-1"}]`,
		CreatedAt:   100,
	}
	require.NoError(t, db.Create(registered).Error)

	var detailFetchCount atomic.Int32
	var detailDepartments []string
	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "department-1", ParentID: "0", Name: "Department 1"},
				{ID: "department-2", ParentID: "0", Name: "Department 2"},
			},
		}, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		switch departmentID {
		case "department-1":
			return []overviewMember{
				{OpenID: "open-registered", ObservedDepartmentID: "department-1"},
				{OpenID: "open-unreg-1", ObservedDepartmentID: "department-1"},
			}, nil
		case "department-2":
			return []overviewMember{
				{OpenID: "open-unreg-2", ObservedDepartmentID: "department-2"},
			}, nil
		default:
			return []overviewMember{}, nil
		}
	}
	fetchCompanyMemberDetails = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		detailFetchCount.Add(1)
		detailDepartments = append(detailDepartments, departmentID)
		switch departmentID {
		case "department-1":
			return []overviewMember{
				{OpenID: "open-registered", Name: "Registered User"},
				{OpenID: "open-unreg-1", Name: "Unregistered One"},
			}, nil
		case "department-2":
			return []overviewMember{
				{OpenID: "open-unreg-2", Name: "Unregistered Two"},
			}, nil
		default:
			return []overviewMember{}, nil
		}
	}

	// Page size 1 with non-computed sort: only enrich the single unregistered
	// row on this page, not every department in the company tree.
	response, err := getCompanyDepartmentUsers(&DepartmentUsersRequest{
		CompanyID:           company.Id,
		DepartmentID:        companyNodeValue(company.Id),
		StartTimestamp:      1,
		EndTimestamp:        200,
		Page:                1,
		PageSize:            1,
		SortBy:              "id",
		SortOrder:           "asc",
		IncludeUnregistered: true,
		RequestUserRole:     common.RoleRootUser,
	})
	require.NoError(t, err)
	require.Len(t, response.Items, 1)
	assert.Equal(t, int64(3), response.Total)
	assert.False(t, response.Items[0].IsRegistered)
	assert.Contains(t, []string{"Unregistered One", "Unregistered Two"}, response.Items[0].DisplayName)
	assert.Equal(t, int32(1), detailFetchCount.Load(), "should only fetch details for page departments")
	require.Len(t, detailDepartments, 1)
	assert.Contains(t, []string{"department-1", "department-2"}, detailDepartments[0])
	assert.NotContains(t, detailDepartments, "0")
}

func TestPopulateDepartmentUserStatsUsesFilteredSpendAndWalletQuotaWithoutSubscription(t *testing.T) {
	previousDB := model.DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.QuotaData{}, &model.UserSubscription{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		_ = sqlDB.Close()
	})

	subscribedUser := &model.User{Id: 1, Quota: 9_000}
	walletUser := &model.User{Id: 2, Quota: 3_500}
	require.NoError(t, db.Create(&model.UserSubscription{
		UserId:      subscribedUser.Id,
		AmountTotal: 5_000,
		AmountUsed:  2_000,
		Status:      "active",
	}).Error)
	require.NoError(t, db.Create([]model.QuotaData{
		{UserID: subscribedUser.Id, ModelName: "model-a", CreatedAt: 150, Quota: 4_000},
		{UserID: walletUser.Id, ModelName: "model-a", CreatedAt: 100, Quota: 1_000},
		{UserID: walletUser.Id, ModelName: "model-b", CreatedAt: 200, Quota: 500},
		{UserID: walletUser.Id, ModelName: "model-c", CreatedAt: 99, Quota: 8_000},
		{UserID: walletUser.Id, ModelName: "model-c", CreatedAt: 201, Quota: 9_000},
	}).Error)
	items := []DepartmentUserItem{
		{User: subscribedUser},
		{User: walletUser},
	}

	populateDepartmentUserStats(items, []int{subscribedUser.Id, walletUser.Id}, 100, 200, nil)

	assert.True(t, items[0].HasActiveSubscription)
	assert.Equal(t, int64(2_000), items[0].SubQuotaUsed)
	assert.Equal(t, int64(5_000), items[0].SubQuotaTotal)
	assert.False(t, items[1].HasActiveSubscription)
	assert.Equal(t, int64(1_500), items[1].SubQuotaUsed)
	assert.Equal(t, int64(5_000), items[1].SubQuotaTotal)
}

func TestMatchOverviewDepartmentMembersUsesFirstDepartmentID(t *testing.T) {
	previousDB := model.DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		_ = sqlDB.Close()
	})

	users := []*model.User{
		{
			Username:    "primary-department-user",
			Password:    "password",
			Company:     "department-match-company",
			OpenId:      "primary-open-id",
			Departments: `[{"department_id":"target"},{"department_id":"secondary"}]`,
			CreatedAt:   100,
		},
		{
			Username:    "secondary-department-user",
			Password:    "password",
			Company:     "department-match-company",
			OpenId:      "secondary-open-id",
			Departments: `[{"department_id":"other"},{"department_id":"target"}]`,
			CreatedAt:   100,
		},
		{
			Username:    "future-department-user",
			Password:    "password",
			Company:     "department-match-company",
			OpenId:      "future-open-id",
			Departments: `[{"department_id":"child"}]`,
			CreatedAt:   300,
		},
	}
	require.NoError(t, db.Create(&users).Error)

	matchedMembers, matchedUsers, err := matchOverviewDepartmentMembers(
		&model.Company{Name: "department-match-company"},
		[]overviewMember{
			{OpenID: "primary-open-id"},
			{OpenID: "secondary-open-id"},
			{OpenID: "future-open-id"},
			{OpenID: "unregistered-open-id"},
		},
		[]string{"target", "child"},
		200,
	)

	require.NoError(t, err)
	assert.Equal(t, []overviewMember{
		{OpenID: "primary-open-id"},
		{OpenID: "future-open-id"},
		{OpenID: "unregistered-open-id"},
	}, matchedMembers)
	require.Len(t, matchedUsers, 1)
	assert.Equal(t, "primary-open-id", matchedUsers[0].OpenId)
}

func TestMatchOverviewDepartmentMembersIncludesDisabledUserFromStoredDepartment(t *testing.T) {
	previousDB := model.DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		_ = sqlDB.Close()
	})

	users := []*model.User{
		{
			Username:    "active-member",
			Password:    "password",
			Company:     "disabled-member-company",
			OpenId:      "active-open-id",
			Departments: `[{"department_id":"target"}]`,
			Status:      common.UserStatusEnabled,
			CreatedAt:   100,
		},
		{
			Username:    "departed-member",
			Password:    "password",
			Company:     "disabled-member-company",
			OpenId:      "departed-open-id",
			Departments: `[{"department_id":"target"}]`,
			Status:      common.UserStatusDisabled,
			CreatedAt:   100,
		},
		{
			Username:    "inactive-non-member",
			Password:    "password",
			Company:     "disabled-member-company",
			OpenId:      "other-open-id",
			Departments: `[{"department_id":"other"}]`,
			Status:      common.UserStatusDisabled,
			CreatedAt:   100,
		},
	}
	require.NoError(t, db.Create(&users).Error)

	matchedMembers, matchedUsers, err := matchOverviewDepartmentMembers(
		&model.Company{Name: "disabled-member-company"},
		[]overviewMember{{OpenID: "active-open-id", ObservedDepartmentID: "target"}},
		[]string{"target"},
		200,
	)

	require.NoError(t, err)
	assert.Equal(t, []overviewMember{
		{OpenID: "active-open-id", ObservedDepartmentID: "target"},
		{OpenID: "departed-open-id", ObservedDepartmentID: "target"},
	}, matchedMembers)
	require.Len(t, matchedUsers, 2)
	assert.Equal(t, []int{users[0].Id, users[1].Id}, userIDsFromUsers(matchedUsers))

	items := mergeDepartmentUsersWithMembers(
		matchedUsers,
		[]string{"active-open-id", "departed-open-id"},
		nil,
		200,
		true,
		"",
	)
	require.Len(t, items, 2)
	assert.Equal(t, departmentRegistrationStatusRegistered, items[0].RegistrationStatus)
	assert.Equal(t, departmentRegistrationStatusDeparted, items[1].RegistrationStatus)
	assert.True(t, items[1].IsRegistered)

	departedItems := mergeDepartmentUsersWithMembers(
		matchedUsers,
		[]string{"active-open-id", "departed-open-id"},
		nil,
		200,
		true,
		departmentRegistrationStatusDeparted,
	)
	require.Len(t, departedItems, 1)
	assert.Equal(t, users[1].Id, departedItems[0].Id)
}

func TestGetDepartmentOverviewSharesUserStatsWithoutChangingModuleResults(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousDirectoryFetcher, previousMemberFetcher := fetchCompanyDirectory, fetchCompanyMembers
	previousStatsBatch := getOverviewUserStatsBatch
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	require.NoError(t, db.AutoMigrate(
		&model.Company{},
		&model.User{},
		&model.QuotaData{},
		&model.Log{},
		&model.UserSubscription{},
	))
	model.DB = db
	model.LOG_DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		getOverviewUserStatsBatch = previousStatsBatch
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:      "shared-stats-company",
		Platform:  model.CompanyPlatformFeishu,
		Status:    model.CompanyStatusEnabled,
		SortOrder: 1,
		Config:    "{}",
	}
	require.NoError(t, db.Create(company).Error)
	const startTimestamp int64 = 1_700_000_000
	const endTimestamp int64 = startTimestamp + 86_400
	users := []*model.User{
		{
			Username:    "shared-stats-user-1",
			Password:    "password",
			DisplayName: "Shared Stats User 1",
			Company:     company.Name,
			OpenId:      "open-id-1",
			Departments: `[{"department_id":"department-1"}]`,
			CreatedAt:   startTimestamp - 1,
		},
		{
			Username:    "shared-stats-user-2",
			Password:    "password",
			DisplayName: "Shared Stats User 2",
			Company:     company.Name,
			OpenId:      "open-id-2",
			Departments: `[{"department_id":"department-1"}]`,
			CreatedAt:   startTimestamp - 1,
		},
		{
			Username:    "shared-stats-user-3",
			Password:    "password",
			DisplayName: "Shared Stats User 3",
			Company:     company.Name,
			OpenId:      "open-id-3",
			Departments: `[{"department_id":"0"}]`,
			CreatedAt:   startTimestamp - 1,
		},
	}
	require.NoError(t, db.Create(&users).Error)
	require.NoError(t, db.Create([]model.QuotaData{
		{UserID: users[0].Id, Username: users[0].Username, ModelName: "model-a", CreatedAt: startTimestamp + 10, TokenUsed: 200, UncachedInputTokens: 120, UncachedOutputTokens: 60, CacheReadTokens: 15, CacheWriteTokens: 5, Count: 3, Quota: 1_000},
		{UserID: users[0].Id, Username: users[0].Username, ModelName: "model-b", CreatedAt: startTimestamp + 20, TokenUsed: 100, UncachedInputTokens: 70, UncachedOutputTokens: 30, Count: 2, Quota: 500},
		{UserID: users[1].Id, Username: users[1].Username, ModelName: "model-a", CreatedAt: startTimestamp + 30, TokenUsed: 50, UncachedInputTokens: 20, UncachedOutputTokens: 10, CacheReadTokens: 20, Count: 1, Quota: 250},
		{UserID: users[2].Id, Username: users[2].Username, ModelName: "model-c", CreatedAt: startTimestamp + 40, TokenUsed: 25, UncachedInputTokens: 15, UncachedOutputTokens: 10, Count: 1, Quota: 100},
	}).Error)
	require.NoError(t, db.Create([]model.UserSubscription{
		{UserId: users[0].Id, AmountTotal: 5_000, AmountUsed: 2_000, Status: "active"},
		{UserId: users[1].Id, AmountTotal: 5_000, AmountUsed: 1_000, Status: "active"},
		{UserId: users[2].Id, AmountTotal: 5_000, AmountUsed: 500, Status: "active"},
	}).Error)

	directory := &overviewDirectory{
		OrganizationName: company.Name,
		Departments: []overviewDepartment{
			{ID: "department-1", ParentID: "0", Name: "Department 1"},
		},
	}
	members := []overviewMember{
		{OpenID: users[0].OpenId, Name: users[0].DisplayName},
		{OpenID: users[1].OpenId, Name: users[1].DisplayName},
	}
	rootMembers := []overviewMember{
		{OpenID: users[2].OpenId, Name: users[2].DisplayName},
	}
	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return directory, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		if departmentID == "department-1" {
			return members, nil
		}
		if departmentID == "0" {
			return rootMembers, nil
		}
		return []overviewMember{}, nil
	}

	statsRequest := &DepartmentStatsRequest{
		CompanyID:       company.Id,
		DepartmentID:    companyNodeValue(company.Id),
		StartTimestamp:  startTimestamp,
		EndTimestamp:    endTimestamp,
		RequestUserRole: common.RoleRootUser,
	}
	usersRequest := &DepartmentUsersRequest{
		CompanyID:           company.Id,
		DepartmentID:        companyNodeValue(company.Id),
		StartTimestamp:      startTimestamp,
		EndTimestamp:        endTimestamp,
		Page:                1,
		PageSize:            10,
		SortBy:              "sub_quota_used",
		SortOrder:           "desc",
		IncludeUnregistered: true,
		RequestUserRole:     common.RoleRootUser,
	}
	expectedSubStats, err := getCompanySubDepartmentStats(statsRequest)
	require.NoError(t, err)
	expectedUsers, err := getCompanyDepartmentUsers(usersRequest)
	require.NoError(t, err)
	expectedRankings, err := getCompanyDepartmentUserRankings(usersRequest)
	require.NoError(t, err)
	require.Len(t, expectedSubStats, 1)
	assert.Equal(t, int64(2), expectedSubStats[0].RegisteredUsers)
	assert.Equal(t, int64(2), expectedSubStats[0].TotalUsers)
	assert.Equal(t, int64(1_750), expectedSubStats[0].TotalQuota)
	assert.Equal(t, int64(350), expectedSubStats[0].TotalTokens)
	assert.Equal(t, int64(6), expectedSubStats[0].TotalRequests)
	require.Len(t, expectedUsers.Items, 3)
	assert.Equal(t, users[0].Username, expectedUsers.Items[0].Username)
	assert.Equal(t, int64(300), expectedUsers.Items[0].TotalTokens)
	assert.Equal(t, int64(5), expectedUsers.Items[0].TotalRequests)
	require.Len(t, expectedRankings, 3)
	assert.Equal(t, users[0].Username, expectedRankings[0].Username)
	assert.Equal(t, int64(300), expectedRankings[0].TotalTokens)
	assert.Equal(t, users[1].Username, expectedRankings[1].Username)
	assert.Equal(t, int64(50), expectedRankings[1].TotalTokens)
	assert.Equal(t, users[2].Username, expectedRankings[2].Username)
	assert.Equal(t, int64(25), expectedRankings[2].TotalTokens)

	var statsBatchCalls atomic.Int32
	getOverviewUserStatsBatch = func(userIDs []int, start int64, end int64) ([]model.UserStatRow, error) {
		statsBatchCalls.Add(1)
		return previousStatsBatch(userIDs, start, end)
	}
	response, err := GetDepartmentOverview(&DepartmentOverviewRequest{
		CompanyID:           company.Id,
		DepartmentID:        companyNodeValue(company.Id),
		StartTimestamp:      startTimestamp,
		EndTimestamp:        endTimestamp,
		Page:                1,
		PageSize:            10,
		SortBy:              "sub_quota_used",
		SortOrder:           "desc",
		IncludeUnregistered: true,
		RequestUserRole:     common.RoleRootUser,
	})

	require.NoError(t, err)
	assert.Equal(t, int32(1), statsBatchCalls.Load())
	assert.Equal(t, expectedSubStats, response.SubStats)
	assert.Equal(t, expectedUsers, response.Users)
	assert.Equal(t, expectedRankings, response.UserRankings)
}

// TestPartitionMatchedMembersBucketsByCostCenterOverPrimaryDepartment verifies
// that a user carrying a cost center is bucketed into the cost-center child
// subtree instead of their directory primary department. Without cost-center
// awareness this user would land in child-a (via child-a-1) even though their
// cost center points at child-b.
func TestPartitionMatchedMembersBucketsByCostCenterOverPrimaryDepartment(t *testing.T) {
	directory := &overviewDirectory{
		OrganizationName: "cost-center-partition-company",
		Departments: []overviewDepartment{
			{ID: "child-a", ParentID: "0", Name: "Child A"},
			{ID: "child-a-1", ParentID: "child-a", Name: "Child A1"},
			{ID: "child-b", ParentID: "0", Name: "Child B"},
		},
	}
	children := []overviewDepartment{
		{ID: "child-a", ParentID: "0", Name: "Child A"},
		{ID: "child-b", ParentID: "0", Name: "Child B"},
	}
	users := []*model.User{
		{
			Id:          1,
			OpenId:      "user-cc",
			Departments: `[{"department_id":"child-a-1"}]`,
			CostCenter:  `[{"department_id":"child-b","name":"Child B","company_id":1}]`,
		},
	}
	members := []overviewMember{
		{OpenID: "user-cc"},
	}

	childMembers, childUsers := partitionMatchedMembersByPrimaryDepartment(
		members,
		users,
		directory,
		children,
		model.CompanyPlatformFeishu,
	)

	require.Len(t, childMembers, 2)
	require.Len(t, childUsers, 2)
	assert.Empty(t, childMembers[0], "cost-center user must not bucket into primary department subtree")
	assert.Empty(t, childUsers[0])
	require.Len(t, childMembers[1], 1)
	assert.Equal(t, "user-cc", childMembers[1][0].OpenID)
	require.Len(t, childUsers[1], 1)
	assert.Equal(t, "user-cc", childUsers[1][0].OpenId)
}

// TestResolveCompanyOverviewAudiencePrefersCostCenterIncludingEmptyOpenID is the
// core regression for cost-center-first attribution. It covers four members:
//   - a cost-center hit reachable from the platform directory (counted, even
//     though the directory primary department points elsewhere),
//   - a cost-center hit whose open_id is empty and therefore invisible to the
//     platform directory (still counted via the local cost-center lookup),
//   - a cost-center miss absent from the platform directory (dropped),
//   - a cost-center miss that the platform directory DOES return (skipped
//     without falling back to the directory primary department).
func TestResolveCompanyOverviewAudiencePrefersCostCenterIncludingEmptyOpenID(t *testing.T) {
	previousDB := model.DB
	previousDirectoryFetcher, previousMemberFetcher := fetchCompanyDirectory, fetchCompanyMembers
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:     "cost-center-attribution-company",
		Platform: model.CompanyPlatformFeishu,
		Status:   model.CompanyStatusEnabled,
		Config:   "{}",
	}
	require.NoError(t, db.Create(company).Error)
	t.Cleanup(func() { InvalidateCompanyOverviewCache(company.Id) })
	companyID := company.Id
	costCenterDepartment1 := fmt.Sprintf(`[{"department_id":"department-1","name":"Department 1","company_id":%d}]`, companyID)
	costCenterOutsideTree := fmt.Sprintf(`[{"department_id":"department-9","name":"Other","company_id":%d}]`, companyID)

	users := []*model.User{
		{
			Username:    "cc-platform-reachable",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "cc-open",
			Departments: `[{"department_id":"department-2"}]`,
			CostCenter:  costCenterDepartment1,
			CreatedAt:   100,
		},
		{
			Username:    "cc-empty-openid",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "",
			CostCenter:  costCenterDepartment1,
			CreatedAt:   100,
		},
		{
			Username:    "cc-miss-invisible",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "other-open",
			Departments: `[{"department_id":"department-1"}]`,
			CostCenter:  costCenterOutsideTree,
			CreatedAt:   100,
		},
		{
			Username:    "cc-miss-platform-reachable",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "primary-open",
			Departments: `[{"department_id":"department-1"}]`,
			CostCenter:  costCenterOutsideTree,
			CreatedAt:   100,
		},
	}
	require.NoError(t, db.Create(&users).Error)

	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "department-1", ParentID: "0", Name: "Department 1"},
				{ID: "department-2", ParentID: "0", Name: "Department 2"},
			},
		}, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		if departmentID == "department-1" {
			return []overviewMember{
				{OpenID: "cc-open"},
				{OpenID: "primary-open"},
			}, nil
		}
		return []overviewMember{}, nil
	}

	departmentValue := companyNodeValue(company.Id)
	audience, _, err := resolveCompanyOverviewAudience(company.Id, departmentValue, 1, common.RoleRootUser, 200)
	require.NoError(t, err)
	require.NotNil(t, audience)

	assert.Equal(t, 2, audience.totalUsers, "only the two cost-center hits should be counted")
	require.Len(t, audience.registeredUserIDs, 2)

	registeredIDSet := make(map[int]bool, len(audience.registeredUserIDs))
	for _, id := range audience.registeredUserIDs {
		registeredIDSet[id] = true
	}
	assert.True(t, registeredIDSet[users[0].Id], "cost-center hit reachable from platform should be registered")
	assert.True(t, registeredIDSet[users[1].Id], "cost-center hit with empty open_id should be registered")
	assert.False(t, registeredIDSet[users[2].Id], "cost-center miss absent from platform must not be counted")
	assert.False(t, registeredIDSet[users[3].Id], "cost-center miss returned by platform must be skipped without fallback")
}

// TestResolveCompanyOverviewAudiencePrefersCostCenterDingTalk mirrors the
// feishu cost-center regression but exercises the DingTalk platform path,
// where department IDs are numeric strings and the company root carries the
// DingTalk root dept id. This guards against platform-specific regressions in
// cost-center attribution (root id injection, numeric department ids).
func TestResolveCompanyOverviewAudiencePrefersCostCenterDingTalk(t *testing.T) {
	previousDB := model.DB
	previousDirectoryFetcher, previousMemberFetcher := fetchCompanyDirectory, fetchCompanyMembers
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:     "dingtalk-cost-center-company",
		Platform: model.CompanyPlatformDingTalk,
		Status:   model.CompanyStatusEnabled,
		Config:   "{}",
	}
	require.NoError(t, db.Create(company).Error)
	t.Cleanup(func() { InvalidateCompanyOverviewCache(company.Id) })
	companyID := company.Id
	costCenterDept100 := fmt.Sprintf(`[{"department_id":"100","name":"Dept 100","company_id":%d}]`, companyID)

	users := []*model.User{
		{
			Username:    "dt-cost-center-reachable",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "dt-open",
			Departments: `[{"department_id":"200"}]`,
			CostCenter:  costCenterDept100,
			CreatedAt:   100,
		},
		{
			Username:    "dt-cost-center-empty-openid",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "",
			CostCenter:  costCenterDept100,
			CreatedAt:   100,
		},
	}
	require.NoError(t, db.Create(&users).Error)

	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "100", ParentID: "1", Name: "Dept 100"},
				{ID: "200", ParentID: "1", Name: "Dept 200"},
			},
		}, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		if departmentID == "100" {
			return []overviewMember{{OpenID: "dt-open"}}, nil
		}
		return []overviewMember{}, nil
	}

	departmentValue := companyNodeValue(company.Id)
	audience, _, err := resolveCompanyOverviewAudience(company.Id, departmentValue, 1, common.RoleRootUser, 200)
	require.NoError(t, err)
	require.NotNil(t, audience)

	assert.Equal(t, 2, audience.totalUsers, "both cost-center hits should be counted under DingTalk")
	require.Len(t, audience.registeredUserIDs, 2)

	registeredIDSet := make(map[int]bool, len(audience.registeredUserIDs))
	for _, id := range audience.registeredUserIDs {
		registeredIDSet[id] = true
	}
	assert.True(t, registeredIDSet[users[0].Id], "DingTalk cost-center hit with open_id should be registered")
	assert.True(t, registeredIDSet[users[1].Id], "DingTalk cost-center hit with empty open_id should be registered")
}

// TestGetCompanyDepartmentUsersIncludesCostCenterMemberWithEmptyOpenID verifies
// that the department user list surfaces cost-center-resolved members whose
// open_id is empty. Such members are present in audience.users (they have a
// local user record) but cannot be matched by open_id, so the merge step must
// append them explicitly instead of dropping them.
func TestGetCompanyDepartmentUsersIncludesCostCenterMemberWithEmptyOpenID(t *testing.T) {
	previousDB := model.DB
	previousDirectoryFetcher, previousMemberFetcher := fetchCompanyDirectory, fetchCompanyMembers
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Company{}, &model.User{}, &model.QuotaData{}))
	model.DB = db
	t.Cleanup(func() {
		model.DB = previousDB
		fetchCompanyDirectory = previousDirectoryFetcher
		fetchCompanyMembers = previousMemberFetcher
		_ = sqlDB.Close()
	})

	company := &model.Company{
		Name:     "cc-users-company",
		Platform: model.CompanyPlatformFeishu,
		Status:   model.CompanyStatusEnabled,
		Config:   "{}",
	}
	require.NoError(t, db.Create(company).Error)
	t.Cleanup(func() { InvalidateCompanyOverviewCache(company.Id) })
	companyID := company.Id
	costCenterDept1 := fmt.Sprintf(`[{"department_id":"department-1","name":"Department 1","company_id":%d}]`, companyID)

	users := []*model.User{
		{
			Username:    "cc-users-reachable",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "cc-open",
			Departments: `[{"department_id":"department-2"}]`,
			CostCenter:  costCenterDept1,
			CreatedAt:   100,
		},
		{
			Username:    "cc-users-empty-openid",
			Password:    "password",
			Company:     company.Name,
			OpenId:      "",
			CostCenter:  costCenterDept1,
			CreatedAt:   100,
		},
	}
	require.NoError(t, db.Create(&users).Error)

	fetchCompanyDirectory = func(*model.Company) (*overviewDirectory, error) {
		return &overviewDirectory{
			OrganizationName: company.Name,
			Departments: []overviewDepartment{
				{ID: "department-1", ParentID: "0", Name: "Department 1"},
				{ID: "department-2", ParentID: "0", Name: "Department 2"},
			},
		}, nil
	}
	fetchCompanyMembers = func(_ *model.Company, departmentID string) ([]overviewMember, error) {
		if departmentID == "department-1" {
			return []overviewMember{{OpenID: "cc-open"}}, nil
		}
		return []overviewMember{}, nil
	}

	response, err := getCompanyDepartmentUsers(&DepartmentUsersRequest{
		CompanyID:           company.Id,
		DepartmentID:        companyNodeValue(company.Id),
		StartTimestamp:      1,
		EndTimestamp:        200,
		Page:                1,
		PageSize:            50,
		SortBy:              "id",
		SortOrder:           "asc",
		IncludeUnregistered: true,
		RequestUserRole:     common.RoleRootUser,
	})
	require.NoError(t, err)
	require.NotNil(t, response)
	assert.Equal(t, int64(2), response.Total, "both cost-center members should appear in the user list")
	require.Len(t, response.Items, 2)

	itemUserIDs := make(map[int]bool, len(response.Items))
	for _, item := range response.Items {
		if item.User != nil {
			itemUserIDs[item.User.Id] = true
		}
	}
	assert.True(t, itemUserIDs[users[0].Id], "cost-center member reachable from platform should be listed")
	assert.True(t, itemUserIDs[users[1].Id], "cost-center member with empty open_id should be listed")
}
