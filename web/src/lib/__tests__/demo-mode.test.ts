import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getDemoModeUsername, isDemoModeEnabled } from '../demo-mode'

describe('demo mode username visibility', () => {
  test('replaces a username with three asterisks when demo mode is enabled', () => {
    assert.equal(getDemoModeUsername('alice', true), '***')
  })

  test('preserves a username when demo mode is disabled', () => {
    assert.equal(getDemoModeUsername('alice', false), 'alice')
  })

  test('recognizes demo mode from object and serialized user settings', () => {
    assert.equal(isDemoModeEnabled({ demo_mode: true }), true)
    assert.equal(isDemoModeEnabled('{"demo_mode":true}'), true)
    assert.equal(isDemoModeEnabled({ demo_mode: false }), false)
  })
})
