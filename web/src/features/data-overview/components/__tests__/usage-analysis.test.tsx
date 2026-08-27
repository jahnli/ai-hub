import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, assert, beforeEach, describe, test, vi } from 'vitest'

import type { UsageAnalysis } from '../../types'

const chartSpecs = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock('@visactor/react-vchart', () => ({
  VChart: (props: { spec: Record<string, unknown> }) => {
    chartSpecs.push(props.spec)
    return null
  },
}))

vi.mock('@/lib/use-chart-theme', () => ({
  useChartTheme: () => ({ resolvedTheme: 'light', themeReady: true }),
}))

vi.mock('@/components/ui/select', async () => {
  const React = await import('react')

  return {
    Select: (props: {
      items: { value: string; label: string }[]
      value: string
      onValueChange: (value: string) => void
      children: ReactNode
    }) => {
      const trigger = React.Children.toArray(props.children)[0]
      const ariaLabel = React.isValidElement<{ 'aria-label'?: string }>(trigger)
        ? trigger.props['aria-label']
        : undefined

      return (
        <select
          aria-label={ariaLabel}
          value={props.value}
          onChange={(event) => props.onValueChange(event.target.value)}
        >
          {props.items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      )
    },
    SelectContent: () => null,
    SelectGroup: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
  }
})

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
        Daily: 'Daily',
        Weekly: 'Weekly',
        Monthly: 'Monthly',
        'Time Granularity': 'Time Granularity',
        Requests: 'Requests',
        times: 'times',
        'Total Cost': 'Total Cost',
        'Unit Price': 'Unit Price',
        '100M Tokens': '100M Tokens',
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
  beforeEach(() => {
    chartSpecs.length = 0
  })

  afterEach(() => {
    cleanup()
  })

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

  test('shows an independent daily granularity selector for every trend chart', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <UsageAnalysisSection data={usageAnalysis} />
      </I18nextProvider>
    )

    const selectors = screen.getAllByRole('combobox')
    assert.equal(selectors.length, 4)
    for (const selector of selectors) {
      assert.equal((selector as HTMLSelectElement).value, 'day')
    }

    assert.ok(
      screen.getByRole('combobox', {
        name: 'Quota Consumption Trend: Time Granularity',
      })
    )
    assert.ok(
      screen.getByRole('combobox', {
        name: 'Model Usage Trend: Time Granularity',
      })
    )
  })

  test('aggregates only the selected request trend into weekly buckets', async () => {
    const user = userEvent.setup()
    const multiDayUsage: UsageAnalysis = {
      ...usageAnalysis,
      daily_stats: [
        {
          date: '2026-08-24',
          total_tokens: 100,
          total_quota: 10,
          total_requests: 3,
        },
        {
          date: '2026-08-25',
          total_tokens: 200,
          total_quota: 20,
          total_requests: 7,
        },
      ],
    }

    render(
      <I18nextProvider i18n={i18n}>
        <UsageAnalysisSection data={multiDayUsage} />
      </I18nextProvider>
    )

    chartSpecs.length = 0
    const requestSelector = screen.getByRole('combobox', {
      name: 'Request Count Trend: Time Granularity',
    })
    await user.selectOptions(requestSelector, 'week')

    assert.equal((requestSelector as HTMLSelectElement).value, 'week')
    assert.equal(
      (
        screen.getByRole('combobox', {
          name: 'Token Usage Trend: Time Granularity',
        }) as HTMLSelectElement
      ).value,
      'day'
    )

    const requestSpec = chartSpecs.at(-1) as {
      data: { values: { date: string; value: number }[] }[]
    }
    assert.deepEqual(requestSpec.data[0].values, [
      { date: '2026-08-24', value: 10 },
    ])
  })
})
