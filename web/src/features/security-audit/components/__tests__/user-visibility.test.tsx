/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { Row } from '@tanstack/react-table'
import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import type { AuditRow, ImageAuditItem } from '../../types'
import { ImageAuditUserCell } from '../image-audit-columns'
import { OffHoursIdentityCell } from '../off-hours-columns'

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
    assert.doesNotMatch(html, /alice/i)
    assert.doesNotMatch(html, /<img/)
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
    assert.doesNotMatch(html, /bob/i)
    assert.doesNotMatch(html, /<img/)
  })
})
