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
