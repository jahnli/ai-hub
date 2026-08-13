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
