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
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window({ url: 'https://console.example.com/api/keys' })

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: domWindow,
})
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: domWindow.localStorage,
})

domWindow.localStorage.setItem(
  'status',
  JSON.stringify({ server_address: 'https://configured.example.com' })
)

const { buildCCSwitchURL } = await import('../../../lib/cc-switch-import')

describe('CC Switch import URL', () => {
  after(() => {
    domWindow.close()
  })

  test('uses the current page origin for Claude instead of the cached server address', () => {
    const url = new URL(
      buildCCSwitchURL(
        'claude',
        'My Claude',
        { model: 'claude-sonnet' },
        'sk-test'
      )
    )

    assert.equal(
      url.searchParams.get('homepage'),
      'https://console.example.com'
    )
    assert.equal(
      url.searchParams.get('endpoint'),
      'https://console.example.com'
    )
  })

  test('appends v1 to the current page origin for Codex', () => {
    const url = new URL(
      buildCCSwitchURL('codex', 'My Codex', { model: 'gpt-5' }, 'sk-test')
    )

    assert.equal(
      url.searchParams.get('homepage'),
      'https://console.example.com'
    )
    assert.equal(
      url.searchParams.get('endpoint'),
      'https://console.example.com/v1'
    )
  })
})
