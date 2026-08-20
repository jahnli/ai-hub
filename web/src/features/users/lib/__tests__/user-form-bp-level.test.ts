import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { User } from '../../types'
import {
  userFormSchema,
  USER_FORM_DEFAULT_VALUES,
  transformFormDataToPayload,
  transformUserToFormDefaults,
  type UserFormValues,
} from '../user-form'

function makeFormValues(
  overrides: Partial<UserFormValues> = {}
): UserFormValues {
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

describe('user form cost_center handling', () => {
  const selectedCostCenter = {
    value: 'dept:7:od-cost-center',
    label: 'Finance',
    department_id: 'od-cost-center',
    company_id: 7,
  }

  test('default values start without a cost center', () => {
    assert.equal(USER_FORM_DEFAULT_VALUES.cost_center, null)
  })

  test('create payload serializes the selected department in departments format', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({ cost_center: selectedCostCenter })
    )
    assert.equal(
      payload.cost_center,
      '[{"department_id":"od-cost-center","name":"Finance","company_id":7}]'
    )
  })

  test('create payload serializes an empty cost center as an empty array', () => {
    const payload = transformFormDataToPayload(makeFormValues())
    assert.equal(payload.cost_center, '[]')
  })

  test('update payload preserves the selected cost center', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({ cost_center: selectedCostCenter }),
      42
    )
    assert.equal(payload.id, 42)
    assert.equal(
      payload.cost_center,
      '[{"department_id":"od-cost-center","name":"Finance","company_id":7}]'
    )
  })

  test('update payload clears the cost center with an empty array', () => {
    const payload = transformFormDataToPayload(
      makeFormValues({ cost_center: null }),
      42
    )
    assert.equal(payload.cost_center, '[]')
  })

  test('form defaults restore the selected tree node from stored cost center JSON', () => {
    const defaults = transformUserToFormDefaults(
      makeUser({
        cost_center:
          '[{"department_id":"od-cost-center","name":"Finance","company_id":7}]',
      })
    )
    assert.deepEqual(defaults.cost_center, selectedCostCenter)
  })

  test('form defaults fall back to no cost center for empty stored JSON', () => {
    const defaults = transformUserToFormDefaults(
      makeUser({ cost_center: '[]' })
    )
    assert.equal(defaults.cost_center, null)
  })
})
