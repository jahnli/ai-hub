package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func configureSubscriptionQuotaAdjustmentTest(t *testing.T) {
	t.Helper()
	previousQuotaPerUnit := common.QuotaPerUnit
	previousExchangeRate := operation_setting.USDExchangeRate
	common.QuotaPerUnit = 100
	operation_setting.USDExchangeRate = 1
	t.Cleanup(func() {
		common.QuotaPerUnit = previousQuotaPerUnit
		operation_setting.USDExchangeRate = previousExchangeRate
	})
}

func createQuotaAdjustmentSubscription(t *testing.T, subscription *UserSubscription) {
	t.Helper()
	require.NoError(t, DB.Create(subscription).Error)
}

func getQuotaAdjustmentSubscription(t *testing.T, subscriptionId int) UserSubscription {
	t.Helper()
	var subscription UserSubscription
	require.NoError(t, DB.Where("id = ?", subscriptionId).First(&subscription).Error)
	return subscription
}

func TestAdminDecreaseUserSubscriptionQuotaReducesAvailableQuota(t *testing.T) {
	truncateTables(t)
	configureSubscriptionQuotaAdjustmentTest(t)
	now := GetDBTimestamp()
	createQuotaAdjustmentSubscription(t, &UserSubscription{
		Id:          9801,
		UserId:      101,
		PlanId:      201,
		AmountTotal: 1000,
		AmountUsed:  400,
		StartTime:   now - 60,
		EndTime:     now + 3600,
		Status:      "active",
	})

	quotaDelta, err := AdminDecreaseUserSubscriptionQuota(9801, 5)

	require.NoError(t, err)
	assert.EqualValues(t, 500, quotaDelta)
	assert.EqualValues(t, 500, getQuotaAdjustmentSubscription(t, 9801).AmountTotal)
}

func TestAdminDecreaseUserSubscriptionQuotaAllowsTotalEqualToUsed(t *testing.T) {
	truncateTables(t)
	configureSubscriptionQuotaAdjustmentTest(t)
	now := GetDBTimestamp()
	createQuotaAdjustmentSubscription(t, &UserSubscription{
		Id:          9802,
		UserId:      102,
		PlanId:      202,
		AmountTotal: 1000,
		AmountUsed:  500,
		StartTime:   now - 60,
		EndTime:     now + 3600,
		Status:      "active",
	})

	quotaDelta, err := AdminDecreaseUserSubscriptionQuota(9802, 5)

	require.NoError(t, err)
	assert.EqualValues(t, 500, quotaDelta)
	assert.EqualValues(t, 500, getQuotaAdjustmentSubscription(t, 9802).AmountTotal)
}

func TestAdminDecreaseUserSubscriptionQuotaRejectsReductionBelowUsed(t *testing.T) {
	truncateTables(t)
	configureSubscriptionQuotaAdjustmentTest(t)
	now := GetDBTimestamp()
	createQuotaAdjustmentSubscription(t, &UserSubscription{
		Id:          9803,
		UserId:      103,
		PlanId:      203,
		AmountTotal: 1000,
		AmountUsed:  600,
		StartTime:   now - 60,
		EndTime:     now + 3600,
		Status:      "active",
	})

	_, err := AdminDecreaseUserSubscriptionQuota(9803, 5)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "不能低于已使用额度")
	assert.EqualValues(t, 1000, getQuotaAdjustmentSubscription(t, 9803).AmountTotal)
}

func TestAdminDecreaseUserSubscriptionQuotaRejectsUnlimitedSubscription(t *testing.T) {
	truncateTables(t)
	configureSubscriptionQuotaAdjustmentTest(t)
	now := GetDBTimestamp()
	createQuotaAdjustmentSubscription(t, &UserSubscription{
		Id:          9804,
		UserId:      104,
		PlanId:      204,
		AmountTotal: 0,
		AmountUsed:  0,
		StartTime:   now - 60,
		EndTime:     now + 3600,
		Status:      "active",
	})

	_, err := AdminDecreaseUserSubscriptionQuota(9804, 1)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "无限额度订阅")
	assert.Zero(t, getQuotaAdjustmentSubscription(t, 9804).AmountTotal)
}

func TestAdminDecreaseUserSubscriptionQuotaRejectsZeroTotal(t *testing.T) {
	truncateTables(t)
	configureSubscriptionQuotaAdjustmentTest(t)
	now := GetDBTimestamp()
	createQuotaAdjustmentSubscription(t, &UserSubscription{
		Id:          9805,
		UserId:      105,
		PlanId:      205,
		AmountTotal: 100,
		AmountUsed:  0,
		StartTime:   now - 60,
		EndTime:     now + 3600,
		Status:      "active",
	})

	_, err := AdminDecreaseUserSubscriptionQuota(9805, 1)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "必须小于当前总额度")
	assert.EqualValues(t, 100, getQuotaAdjustmentSubscription(t, 9805).AmountTotal)
}
