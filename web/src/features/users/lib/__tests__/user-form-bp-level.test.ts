/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

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

import {
  userFormSchema,
  USER_FORM_DEFAULT_VALUES,
  clampBpLevelToDepartment,
  transformFormDataToPayload,
  transformUserToFormDefaults,
  type UserFormValues,
} from '../user-form'
import type { User } from '../../types'

function makeFormValues(overrides: Partial<UserFormValues> = {}): UserFormValues {
  return { ...USER_FORM_DEFAULT_VALUES, username: 'bp-user', ...overrides }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'bp-user',
    display_name: 'bp-user',
    quota: 0,
    used_quota: 0,
    has_active_subscription: false,
    sub_quota_used: 0,
    sub_quota_total: 0,
    monthly_total_amount_cny: 0,
    monthly_total_tokens: 0,
    monthly_total_requests: 0,
    request_count: 0,
    group: 'default',
    status: 1,
    role: 2,
    ...overrides,
  }
}

describe('user form bp_level handling', () => {
  test('schema accepts any non-negative integer bp_level', () => {
    for (const level of [0, 1, 3, 9, 20]) {
      const parsed = userFormSchema.safeParse(makeFormValues({ bp_level: level }))
      assert.equal(parsed.success, true)
    }
  })

  test('schema rejects negative and non-integer bp_level', () => {
    assert.equal(userFormSchema.safeParse(makeFormValues({ bp_level: -1 })).success, false)
    assert.equal(userFormSchema.safeParse(makeFormValues({ bp_level: 1.5 })).success, false)
  })

  test('default values start with bp_level 0', () => {
    assert.equal(USER_FORM_DEFAULT_VALUES.bp_level, 0)
  })

  test('create payload carries the selected bp_level', () => {
    const payload = transformFormDataToPayload(makeFormValues({ bp_level: 2 }))

    assert.equal(payload.bp_level, 2)
  })

  test('create payload defaults bp_level to 0 when unset', () => {
    const payload = transformFormDataToPayload(makeFormValues())

    assert.equal(payload.bp_level, 0)
  })

  test('update payload carries the selected bp_level', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({ bp_level: 1, group: 'default', remark: '' }),
      42
    )

    assert.equal(payload.id, 42)
    assert.equal(payload.bp_level, 1)
  })

  test('form defaults map the stored user bp_level', () => {
    const defaults = transformUserToFormDefaults(makeUser({ bp_level: 3 }))

    assert.equal(defaults.bp_level, 3)
  })

  test('form defaults fall back to 0 when the user has no bp_level', () => {
    const defaults = transformUserToFormDefaults(makeUser())

    assert.equal(defaults.bp_level, 0)
  })

  test('clampBpLevelToDepartment clamps levels beyond the department depth', () => {
    assert.equal(
      clampBpLevelToDepartment(9, '数智产品中心 / AI应用技术部 / AI工程效率科'),
      3
    )
    assert.equal(clampBpLevelToDepartment(2, '数智产品中心 / AI应用技术部'), 2)
  })

  test('clampBpLevelToDepartment keeps level when hierarchy is unknown or unset', () => {
    assert.equal(clampBpLevelToDepartment(5, ''), 5)
    assert.equal(clampBpLevelToDepartment(5, undefined), 5)
    assert.equal(clampBpLevelToDepartment(0, '数智产品中心'), 0)
  })
})
