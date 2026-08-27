import { assert, describe, test } from 'vitest'

import type { DailyStat, ModelDailyStat } from '../../types'
import {
  aggregateDailyStats,
  aggregateModelDailyStats,
  formatUsageBucketLabel,
} from '../usage-analysis-granularity'

const dailyStats: DailyStat[] = [
  {
    date: '2025-12-31',
    total_tokens: 10,
    total_quota: 1,
    total_requests: 1,
  },
  {
    date: '2026-01-01',
    total_tokens: 20,
    total_quota: 2,
    total_requests: 2,
  },
  {
    date: '2026-01-04',
    total_tokens: 30,
    total_quota: 3,
    total_requests: 3,
  },
  {
    date: '2026-01-05',
    total_tokens: 40,
    total_quota: 4,
    total_requests: 4,
  },
]

describe('usage analysis time aggregation', () => {
  test('keeps daily values and sorts them chronologically', () => {
    const result = aggregateDailyStats([...dailyStats].reverse(), 'day')

    assert.deepEqual(result, dailyStats)
  })

  test('uses Monday as the first day of each weekly bucket', () => {
    const result = aggregateDailyStats(dailyStats, 'week')

    assert.deepEqual(result, [
      {
        date: '2025-12-29',
        total_tokens: 60,
        total_quota: 6,
        total_requests: 6,
      },
      {
        date: '2026-01-05',
        total_tokens: 40,
        total_quota: 4,
        total_requests: 4,
      },
    ])
  })

  test('groups values by calendar month across a year boundary', () => {
    const result = aggregateDailyStats(dailyStats, 'month')

    assert.deepEqual(result, [
      {
        date: '2025-12-01',
        total_tokens: 10,
        total_quota: 1,
        total_requests: 1,
      },
      {
        date: '2026-01-01',
        total_tokens: 90,
        total_quota: 9,
        total_requests: 9,
      },
    ])
  })

  test('keeps model totals separate within each weekly bucket', () => {
    const modelStats: ModelDailyStat[] = [
      { date: '2026-01-01', model_name: 'alpha', total_tokens: 10 },
      { date: '2026-01-04', model_name: 'alpha', total_tokens: 20 },
      { date: '2026-01-04', model_name: 'beta', total_tokens: 30 },
      { date: '2026-01-05', model_name: 'alpha', total_tokens: 40 },
    ]

    const result = aggregateModelDailyStats(modelStats, 'week')

    assert.deepEqual(result, [
      { date: '2025-12-29', model_name: 'alpha', total_tokens: 30 },
      { date: '2025-12-29', model_name: 'beta', total_tokens: 30 },
      { date: '2026-01-05', model_name: 'alpha', total_tokens: 40 },
    ])
  })

  test('returns stable labels for daily, weekly, and monthly buckets', () => {
    assert.equal(formatUsageBucketLabel('2026-08-27', 'day'), '08-27')
    assert.equal(formatUsageBucketLabel('2026-08-24', 'week'), '08-24 – 08-30')
    assert.equal(formatUsageBucketLabel('2026-08-01', 'month'), '2026-08')
  })

  test('returns empty output for empty input', () => {
    assert.deepEqual(aggregateDailyStats([], 'month'), [])
    assert.deepEqual(aggregateModelDailyStats([], 'week'), [])
  })
})
