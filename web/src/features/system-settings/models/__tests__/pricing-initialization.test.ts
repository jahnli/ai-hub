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

import { createInitialLaneState } from '../model-pricing-core'

describe('model pricing lane initialization', () => {
  test('enables completion and cache read prices when editing an unpriced model', () => {
    const initialLaneState = createInitialLaneState({
      name: 'unpriced-model',
      billingMode: 'per-token',
    })

    assert.equal(initialLaneState.enabled.completion, true)
    assert.equal(initialLaneState.enabled.cache, true)
    assert.equal(initialLaneState.prices.completion, '')
    assert.equal(initialLaneState.prices.cache, '')
    assert.equal(initialLaneState.enabled.createCache, false)
    assert.equal(initialLaneState.enabled.image, false)
    assert.equal(initialLaneState.enabled.audioInput, false)
    assert.equal(initialLaneState.enabled.audioOutput, false)
  })

  test('preserves configured lane selection when the model already has pricing', () => {
    const initialLaneState = createInitialLaneState({
      name: 'priced-model',
      ratio: '1',
      completionRatio: '2',
    })

    assert.equal(initialLaneState.enabled.completion, true)
    assert.equal(initialLaneState.enabled.cache, false)
    assert.equal(initialLaneState.prices.completion, '4')
  })
})
