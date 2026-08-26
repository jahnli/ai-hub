import type { Row } from '@tanstack/react-table'
import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { assert, describe, expect, test, vi } from 'vitest'

import type { AuditRow, ImageAuditItem } from '../../types'
import { ImageAuditUserCell } from '../image-audit-columns'
import { OffHoursIdentityCell } from '../off-hours-columns'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: { days: 'days' } } },
})

describe('security audit user visibility', () => {
  test('masks off-hours audit users without exposing avatars or names', () => {
    const audit: AuditRow = {
      id: 'user-7',
      kind: 'user',
      user: {
        user_id: 7,
        username: 'alice',
        display_name: 'Alice Example',
        avatar_url: 'https://example.com/alice.png',
        days: 1,
        models: [],
        ips: [],
        count: 2,
        quota: 10,
        day_rows: [],
      },
    }
    const row = { original: audit } as Row<AuditRow>

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OffHoursIdentityCell row={row} demoMode />
      </I18nextProvider>
    )

    assert.match(html, /\*\*\*/)
    expect(html).not.toMatch(/alice/i)
    expect(html).not.toMatch(/<img/)
  })

  test('masks image audit users without exposing avatars or names', () => {
    const item: ImageAuditItem = {
      id: 'image-8',
      user_id: 8,
      username: 'bob',
      display_name: 'Bob Example',
      avatar_url: 'https://example.com/bob.png',
      created_at: 0,
      updated_at: 0,
      mode: 'generate',
      prompt: '',
      model: 'image-model',
      group: 'default',
      size: '1024x1024',
      n: 1,
      duration_ms: 0,
      favorite: false,
      images: [],
    }

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ImageAuditUserCell item={item} demoMode />
      </I18nextProvider>
    )

    assert.match(html, /\*\*\*/)
    expect(html).not.toMatch(/bob/i)
    expect(html).not.toMatch(/<img/)
  })
})
