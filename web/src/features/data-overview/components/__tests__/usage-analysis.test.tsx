// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import type { UsageAnalysis } from '../../types'

mock.module('@visactor/react-vchart', () => ({
  VChart: () => null,
}))

const { UsageAnalysisSection } = await import('../usage-analysis')

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Usage Analysis': 'Usage Analysis',
        'Model Series Call Distribution': 'Model Series Call Distribution',
        'Model Series Consumption Ranking': 'Model Series Consumption Ranking',
        'Model Call Distribution': 'Model Call Distribution',
        'Model Consumption Ranking': 'Model Consumption Ranking',
        'Quota Consumption Trend': 'Quota Consumption Trend',
        'Request Count Trend': 'Request Count Trend',
        'Token Usage Trend': 'Token Usage Trend',
        'Model Usage Trend': 'Model Usage Trend',
      },
    },
  },
})

const usageAnalysis: UsageAnalysis = {
  model_stats: [
    {
      model_name: 'gpt-5',
      total_tokens: 100,
      total_quota: 10,
      total_requests: 1,
    },
  ],
  model_series_stats: [
    {
      model_name: 'GPT',
      total_tokens: 100,
      total_quota: 10,
      total_requests: 1,
    },
  ],
  daily_stats: [
    {
      date: '2026-08-01',
      total_tokens: 100,
      total_quota: 10,
      total_requests: 1,
    },
  ],
  model_daily_stats: [
    {
      date: '2026-08-01',
      model_name: 'gpt-5',
      total_tokens: 100,
    },
  ],
  quota_to_cny: 0.1,
}

describe('usage analysis chart layout', () => {
  test('places all model distribution and ranking charts before trend charts', () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <UsageAnalysisSection data={usageAnalysis} />
      </I18nextProvider>
    )
    const chartTitles = [...markup.matchAll(/data-chart-title="([^"]+)"/g)].map(
      (match) => match[1]
    )

    assert.deepEqual(chartTitles.slice(0, 4), [
      'Model Series Call Distribution',
      'Model Series Consumption Ranking',
      'Model Call Distribution',
      'Model Consumption Ranking',
    ])
  })
})
