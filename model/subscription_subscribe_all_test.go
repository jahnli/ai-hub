package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestAdminSubscribeAllUsersIncludesDisabledAndDeletedUsersInSelectedCompany(t *testing.T) {
	previousDB := DB
	previousMainDatabaseType := common.MainDatabaseType()
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.LogDatabaseType())
	database, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	DB = database
	require.NoError(t, database.AutoMigrate(&Company{}, &User{}, &SubscriptionPlan{}, &UserSubscription{}))
	sqlDatabase, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		DB = previousDB
		common.SetDatabaseTypes(previousMainDatabaseType, common.LogDatabaseType())
		_ = sqlDatabase.Close()
	})

	selectedCompany := Company{
		Name:      "selected-company",
		Alias:     "Selected Company",
		Platform:  CompanyPlatformNone,
		Status:    CompanyStatusEnabled,
		SortOrder: 1,
		Config:    "{}",
	}
	otherCompany := Company{
		Name:      "other-company",
		Alias:     "Other Company",
		Platform:  CompanyPlatformNone,
		Status:    CompanyStatusEnabled,
		SortOrder: 2,
		Config:    "{}",
	}
	require.NoError(t, database.Create(&selectedCompany).Error)
	require.NoError(t, database.Create(&otherCompany).Error)

	users := []User{
		{Username: "selected-enabled", Password: "password", Status: common.UserStatusEnabled, Company: selectedCompany.Name},
		{Username: "selected-disabled", Password: "password", Status: common.UserStatusDisabled, Company: selectedCompany.Name},
		{Username: "selected-deleted", Password: "password", Status: common.UserStatusEnabled, Company: selectedCompany.Name},
		{Username: "other-enabled", Password: "password", Status: common.UserStatusEnabled, Company: otherCompany.Name},
	}
	require.NoError(t, database.Create(&users).Error)
	require.NoError(t, database.Delete(&users[2]).Error)
	plan := SubscriptionPlan{
		Title:         "Team",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   1500,
		Enabled:       true,
	}
	require.NoError(t, database.Create(&plan).Error)
	now := common.GetTimestamp()
	replacementStartTime := now - 60
	historicalSubscription := UserSubscription{
		UserId:      users[0].Id,
		PlanId:      plan.Id,
		AmountTotal: 1800,
		AmountUsed:  300,
		StartTime:   now - 3600,
		EndTime:     replacementStartTime,
		Status:      "cancelled",
		Source:      "admin",
	}
	require.NoError(t, database.Create(&historicalSubscription).Error)
	existingSubscription := UserSubscription{
		UserId:      users[0].Id,
		PlanId:      plan.Id,
		AmountTotal: 1500,
		AmountUsed:  0,
		StartTime:   replacementStartTime,
		EndTime:     now + 3600,
		Status:      "active",
		Source:      "admin",
	}
	require.NoError(t, database.Create(&existingSubscription).Error)
	InvalidateSubscriptionPlanCache(plan.Id)

	result, err := AdminSubscribeAllUsers(plan.Id, selectedCompany.Id)
	require.NoError(t, err)
	assert.Equal(t, AdminSubscribeAllUsersResult{Created: 3}, result)

	var activeSubscriptions []UserSubscription
	require.NoError(t, database.
		Where("status = ?", "active").
		Order("user_id asc").
		Find(&activeSubscriptions).Error)
	require.Len(t, activeSubscriptions, 3)
	assert.Equal(t, []int{users[0].Id, users[1].Id, users[2].Id}, []int{
		activeSubscriptions[0].UserId,
		activeSubscriptions[1].UserId,
		activeSubscriptions[2].UserId,
	})
	for index, subscription := range activeSubscriptions {
		assert.EqualValues(t, 1500, subscription.AmountTotal)
		if index == 0 {
			assert.EqualValues(t, 300, subscription.AmountUsed)
		} else {
			assert.Zero(t, subscription.AmountUsed)
		}
	}

	var replacedSubscription UserSubscription
	require.NoError(t, database.First(&replacedSubscription, existingSubscription.Id).Error)
	assert.Equal(t, "cancelled", replacedSubscription.Status)
}

func TestAdminSubscribeAllUsersRejectsCompanyOutsidePlanScope(t *testing.T) {
	previousDB := DB
	previousMainDatabaseType := common.MainDatabaseType()
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.LogDatabaseType())
	database, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	DB = database
	require.NoError(t, database.AutoMigrate(&Company{}, &User{}, &SubscriptionPlan{}, &UserSubscription{}))
	sqlDatabase, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		DB = previousDB
		common.SetDatabaseTypes(previousMainDatabaseType, common.LogDatabaseType())
		_ = sqlDatabase.Close()
	})

	company := Company{
		Name:      "other-company",
		Alias:     "Other Company",
		Platform:  CompanyPlatformNone,
		Status:    CompanyStatusEnabled,
		SortOrder: 1,
		Config:    "{}",
	}
	require.NoError(t, database.Create(&company).Error)
	plan := SubscriptionPlan{
		Title:         "Scoped Team",
		Company:       "selected-company",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   100,
		Enabled:       true,
	}
	require.NoError(t, database.Create(&plan).Error)
	InvalidateSubscriptionPlanCache(plan.Id)

	result, err := AdminSubscribeAllUsers(plan.Id, company.Id)
	require.ErrorContains(t, err, "套餐不适用于所选公司")
	assert.Equal(t, AdminSubscribeAllUsersResult{}, result)

	var subscriptionCount int64
	require.NoError(t, database.Model(&UserSubscription{}).Count(&subscriptionCount).Error)
	assert.Zero(t, subscriptionCount)
}
