import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { PricingModel } from '../../types'
import { getModelDisplayGroup } from '../model-helpers'

const model = {
  id: 1,
  model_name: 'demo-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 1,
  enable_groups: ['default', 'vip'],
} satisfies PricingModel

describe('model card display group', () => {
  test('shows the current user group when it is available', () => {
    assert.equal(getModelDisplayGroup(model, 'vip'), 'vip')
  })

  test('falls back to the first enabled group when the user group is empty', () => {
    assert.equal(getModelDisplayGroup(model), 'default')
    assert.equal(getModelDisplayGroup(model, '  '), 'default')
  })

  test('returns no group when the model has no enabled groups', () => {
    assert.equal(
      getModelDisplayGroup({ ...model, enable_groups: [] }),
      undefined
    )
  })
})
