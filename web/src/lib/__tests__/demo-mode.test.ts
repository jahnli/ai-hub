import { assert, describe, test } from 'vitest'

import {
  getDemoModeUsername,
  isDemoModeEnabled,
  maskFormattedCurrencyAmount,
} from '../demo-mode'

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

  test('masks currency digits while preserving the currency symbol', () => {
    assert.equal(maskFormattedCurrencyAmount('$12.500'), '$*')
    assert.equal(maskFormattedCurrencyAmount('¥88.00'), '¥*')
  })

  test('uses the demo mask when a formatted amount has no currency symbol', () => {
    assert.equal(maskFormattedCurrencyAmount('12.500'), '*')
  })
})
