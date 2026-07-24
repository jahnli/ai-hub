import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getOverviewLoadingState } from '../lib/overview-loading'

describe('data overview progressive loading', () => {
  test('shows every unfinished module skeleton without hiding loaded statistics', () => {
    const state = getOverviewLoadingState({
      statsFetching: false,
      hasStatsData: true,
      subStatsFetching: true,
      hasSubStatsData: false,
      usageFetching: true,
      hasUsageData: false,
      usersFetching: true,
      hasUsersData: false,
      rankingsFetching: true,
      hasRankingsData: false,
    })

    assert.equal(state.showStatsSkeleton, false)
    assert.equal(state.showSubStatsSkeleton, true)
    assert.equal(state.showUsageSkeleton, true)
    assert.equal(state.showUsersSkeleton, true)
    assert.equal(state.showRankingsSkeleton, true)
    assert.equal(state.isSearching, true)
  })

  test('shows loaded modules while statistics are still loading', () => {
    const state = getOverviewLoadingState({
      statsFetching: true,
      hasStatsData: false,
      subStatsFetching: false,
      hasSubStatsData: true,
      usageFetching: false,
      hasUsageData: true,
      usersFetching: false,
      hasUsersData: true,
      rankingsFetching: false,
      hasRankingsData: true,
    })

    assert.equal(state.showStatsSkeleton, true)
    assert.equal(state.showSubStatsSkeleton, false)
    assert.equal(state.showUsageSkeleton, false)
    assert.equal(state.showUsersSkeleton, false)
    assert.equal(state.showRankingsSkeleton, false)
    assert.equal(state.isSearching, true)
  })

  test('keeps cached module data visible during a background refetch', () => {
    const state = getOverviewLoadingState({
      statsFetching: true,
      hasStatsData: true,
      subStatsFetching: true,
      hasSubStatsData: true,
      usageFetching: true,
      hasUsageData: true,
      usersFetching: true,
      hasUsersData: true,
      rankingsFetching: true,
      hasRankingsData: true,
    })

    assert.equal(state.showStatsSkeleton, false)
    assert.equal(state.showSubStatsSkeleton, false)
    assert.equal(state.showUsageSkeleton, false)
    assert.equal(state.showUsersSkeleton, false)
    assert.equal(state.showRankingsSkeleton, false)
    assert.equal(state.isSearching, true)
  })
})
