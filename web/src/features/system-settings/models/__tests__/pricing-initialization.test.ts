import { assert, describe, test } from 'vitest'

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
