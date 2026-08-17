// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import type { DepartmentStat } from '../../types'

mock.module('@/stores/auth-store', () => ({
  useAuthStore: () => 0,
}))

const { DepartmentStatsCards } = await import('../department-stats-cards')

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Total Tokens': 'Total Tokens',
        'View details': 'View details',
      },
    },
  },
})

const departmentStat: DepartmentStat = {
  total_tokens: 123_456_789,
  uncached_input_tokens: 50_000_000,
  uncached_output_tokens: 20_000_000,
  cache_read_tokens: 40_000_000,
  cache_write_tokens: 13_456_789,
  total_quota: 0,
  total_amount_cny: 0,
  total_requests: 0,
  total_errors: 0,
  total_use_time: 0,
  avg_use_time: 0,
  error_rate: 0,
  unit_price_per_100m_tokens: 0,
  registered_users: 0,
  unregistered_users: 0,
  active_users: 0,
  active_user_rate: 0,
  avg_tokens_per_active_user_mt: 0,
  active_user_formula: [10, 1_000_000, 0.85],
  active_user_request_threshold: 0,
  active_user_token_threshold: 0,
  cost_buckets: [],
  high_cost_users: 0,
  high_cost_user_rate: 0,
  high_cost_threshold_cny: 10,
}

describe('department stats card tooltips', () => {
  test('shows an accessible details icon beside the total token value', () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DepartmentStatsCards stat={departmentStat} />
      </I18nextProvider>
    )

    assert.match(markup, /aria-label="View details"/)
    assert.match(markup, />1\.23 亿</)
  })
})
