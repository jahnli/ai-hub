import { assert, describe, test } from 'vitest'

import {
  buildModelCallDistributionData,
  buildModelCostRankData,
} from '../lib/usage-analysis-chart-data'
import type { ModelStat } from '../types'

const modelSeriesStats: ModelStat[] = [
  {
    model_name: 'GPT',
    total_tokens: 300,
    total_quota: 30,
    total_requests: 3,
  },
  {
    model_name: 'Claude',
    total_tokens: 300,
    total_quota: 50,
    total_requests: 5,
  },
  {
    model_name: 'Unused',
    total_tokens: 0,
    total_quota: 0,
    total_requests: 0,
  },
]

describe('model series usage analysis chart data', () => {
  test('builds request distribution and ignores zero-request series', () => {
    const result = buildModelCallDistributionData(modelSeriesStats, 0.1)

    assert.deepEqual(result, {
      values: [
        {
          name: 'GPT',
          value: 3,
          cost: 3,
          tokens: 300,
        },
        {
          name: 'Claude',
          value: 5,
          cost: 5,
          tokens: 300,
        },
      ],
      totalRequests: 8,
    })
  })

  test('sorts all series by quota and applies the currency conversion once', () => {
    const result = buildModelCostRankData(modelSeriesStats, 0.1)

    assert.deepEqual(result, [
      { name: 'Claude', value: 5, tokens: 300, requests: 5 },
      { name: 'GPT', value: 3, tokens: 300, requests: 3 },
      { name: 'Unused', value: 0, tokens: 0, requests: 0 },
    ])
  })

  test('supports the existing model chart limit without limiting series charts', () => {
    const stats = Array.from({ length: 16 }, (_, index) => ({
      model_name: `Series ${index}`,
      total_tokens: index,
      total_quota: index,
      total_requests: index,
    }))

    assert.equal(buildModelCostRankData(stats, 1).length, 16)
    assert.equal(buildModelCostRankData(stats, 1, 15).length, 15)
  })
})
