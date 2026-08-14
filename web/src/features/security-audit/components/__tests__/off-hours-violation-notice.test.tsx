import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import { Dialog } from '@/components/ui/dialog'

import type { OffHoursDetailTarget } from '../../types'
import { useOffHoursColumns } from '../off-hours-columns'
import { OffHoursDetailDialogHeader } from '../off-hours-detail-dialog'
import { OffHoursViolationNoticeButton } from '../off-hours-violation-notice'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'Violation Notice': 'Violation Notice',
        'Confirm Violation Notice': 'Confirm Violation Notice',
        'Send a violation notice to this user via Feishu?':
          'Send a violation notice to this user via Feishu?',
        Send: 'Send',
      },
    },
  },
})

const target: OffHoursDetailTarget = {
  userId: 7,
  username: 'alice',
  displayName: 'Alice',
  date: '2026-08-05',
  windowStart: 1,
  windowEnd: 3,
  requestStart: 1,
  requestEnd: 2,
  requestCount: 7,
}

function ColumnOrderHarness() {
  const columns = useOffHoursColumns(() => undefined)
  return <div>{columns.map((column) => column.id).join(',')}</div>
}

describe('off-hours violation notice', () => {
  test('does not add a violation notice column to the audit table', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ColumnOrderHarness />
      </I18nextProvider>
    )

    assert.match(html, /quota,models/)
    assert.doesNotMatch(html, /violation_notice/)
  })

  test('shows the violation notice action in the log dialog header', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <Dialog open>
            <OffHoursDetailDialogHeader
              target={target}
              displayedUsername='Alice'
              windowLabel='00:00 - 06:00'
            />
          </Dialog>
        </I18nextProvider>
      </QueryClientProvider>
    )

    assert.match(html, /justify-between/)
    assert.match(html, /Violation Notice/)
    assert.match(html, /<button/)
  })

  test('renders a notification button from the selected log target', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <OffHoursViolationNoticeButton target={target} />
        </I18nextProvider>
      </QueryClientProvider>
    )

    assert.match(html, /Violation Notice/)
  })
})
