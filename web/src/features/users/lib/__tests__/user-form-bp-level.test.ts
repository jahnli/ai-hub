import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  userFormSchema,
  USER_FORM_DEFAULT_VALUES,
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

describe('user form overview_dept_ids handling', () => {
  test('schema accepts an array of dept node value strings', () => {
    const parsed = userFormSchema.safeParse(
      makeFormValues({ overview_dept_ids: ['1:od-abc', '1:od-def'] })
    )
    assert.equal(parsed.success, true)
  })

  test('schema accepts an empty array', () => {
    const parsed = userFormSchema.safeParse(
      makeFormValues({ overview_dept_ids: [] })
    )
    assert.equal(parsed.success, true)
  })

  test('schema accepts undefined overview_dept_ids', () => {
    const parsed = userFormSchema.safeParse(
      makeFormValues({ overview_dept_ids: undefined })
    )
    assert.equal(parsed.success, true)
  })

  test('default values start with empty overview_dept_ids', () => {
    assert.deepEqual(USER_FORM_DEFAULT_VALUES.overview_dept_ids, [])
  })

  test('create payload carries the selected overview_dept_ids', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({ overview_dept_ids: ['1:od-xxx', '1:od-yyy'] })
    )
    assert.deepEqual(payload.overview_dept_ids, ['1:od-xxx', '1:od-yyy'])
  })

  test('create payload defaults overview_dept_ids to empty array when unset', () => {
    const payload = transformFormDataToPayload(makeFormValues())
    assert.deepEqual(payload.overview_dept_ids, [])
  })

  test('update payload carries the selected overview_dept_ids', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({
        overview_dept_ids: ['1:od-abc'],
        group: 'default',
        remark: '',
      }),
      42
    )
    assert.equal(payload.id, 42)
    assert.deepEqual(payload.overview_dept_ids, ['1:od-abc'])
  })

  test('form defaults map the stored user overview_dept_ids', () => {
    const defaults = transformUserToFormDefaults(
      makeUser({ overview_dept_ids: ['1:od-abc', '1:od-def'] })
    )
    assert.deepEqual(defaults.overview_dept_ids, ['1:od-abc', '1:od-def'])
  })

  test('form defaults fall back to empty array when user has no overview_dept_ids', () => {
    const defaults = transformUserToFormDefaults(makeUser())
    assert.deepEqual(defaults.overview_dept_ids, [])
  })

})
