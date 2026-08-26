import { beforeAll, describe, expect, test } from 'vitest'

import { buildCCSwitchURL } from '../../../lib/cc-switch-import'

beforeAll(() => {
  window.history.replaceState({}, '', '/api/keys')
  localStorage.setItem(
    'status',
    JSON.stringify({ server_address: 'https://configured.example.com' })
  )
})

describe('CC Switch import URL', () => {
  test('uses the current page origin for Claude instead of the cached server address', () => {
    const url = new URL(
      buildCCSwitchURL(
        'claude',
        'My Claude',
        { model: 'claude-sonnet' },
        'sk-test'
      )
    )

    expect(url.searchParams.get('homepage')).toBe(window.location.origin)
    expect(url.searchParams.get('endpoint')).toBe(window.location.origin)
  })

  test('appends v1 to the current page origin for Codex', () => {
    const url = new URL(
      buildCCSwitchURL('codex', 'My Codex', { model: 'gpt-5' }, 'sk-test')
    )

    expect(url.searchParams.get('homepage')).toBe(window.location.origin)
    expect(url.searchParams.get('endpoint')).toBe(
      `${window.location.origin}/v1`
    )
  })
})
