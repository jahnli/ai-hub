package service

import (
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

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
		"department-match-company",
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
