import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { assert, describe, test, vi } from 'vitest'

import zhLocale from '@/i18n/locales/zh.json'

import type { DepartmentStat } from '../../types'

vi.mock('@/stores/auth-store', () => ({
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
    zh: zhLocale,
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

  test('adds spaces between numbers and Chinese text in cost details', async () => {
    await i18n.changeLanguage('zh')
    const statWithCostDistribution: DepartmentStat = {
      ...departmentStat,
      cost_buckets: [
        { min_amount_cny: 0, max_amount_cny: 0, users: 2 },
        { min_amount_cny: 1, max_amount_cny: 10, users: 3 },
        { min_amount_cny: 10, max_amount_cny: 0, users: 4 },
      ],
    }

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DepartmentStatsCards stat={statWithCostDistribution} />
      </I18nextProvider>
    )

    assert.match(markup, />费用 &gt; 10 人数\/占比</)
    assert.match(markup, />消费超过 10 元的人数及占比</)
    assert.equal(i18n.t('Spent ¥0'), '0 元消费')
    assert.equal(
      i18n.t('Spent ¥{{min}}~¥{{max}}', { min: 1, max: 10 }),
      '1~10 元消费'
    )
    assert.equal(i18n.t('Spent over ¥{{min}}', { min: 10 }), '10 元以上消费')
    assert.equal(i18n.t('{{count}} people', { count: 2 }), '2 人')
  })
})
