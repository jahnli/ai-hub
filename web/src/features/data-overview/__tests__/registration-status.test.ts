import { assert, describe, test } from 'vitest'

import {
  DEPARTMENT_REGISTRATION_STATUS,
  getDepartmentRegistrationStatusLabel,
  getDepartmentUserRegistrationStatus,
  isDepartmentUserRegistered,
} from '../lib/registration-status'
import type { DepartmentUser } from '../types'

function createDepartmentUser(
  overrides: Partial<DepartmentUser>
): DepartmentUser {
  return {
    id: 1,
    username: 'department-user',
    display_name: 'Department User',
    quota: 0,
    used_quota: 0,
    sub_quota_used: 0,
    sub_quota_total: 0,
    total_amount_cny: 0,
    total_tokens: 0,
    total_requests: 0,
    request_count: 0,
    group: 'default',
    status: 1,
    role: 1,
    ...overrides,
  }
}

describe('department user registration status', () => {
  test('shows a disabled department account as departed while keeping it registered', () => {
    const user = createDepartmentUser({
      status: 2,
      is_registered: true,
      registration_status: DEPARTMENT_REGISTRATION_STATUS.DEPARTED,
    })

    const status = getDepartmentUserRegistrationStatus(user)

    assert.equal(status, DEPARTMENT_REGISTRATION_STATUS.DEPARTED)
    assert.equal(getDepartmentRegistrationStatusLabel(status), 'Departed')
    assert.equal(isDepartmentUserRegistered(user), true)
  })

  test('preserves unregistered status for directory members without an account', () => {
    const user = createDepartmentUser({
      id: 0,
      status: 0,
      is_registered: false,
      registration_status: DEPARTMENT_REGISTRATION_STATUS.UNREGISTERED,
    })

    assert.equal(
      getDepartmentUserRegistrationStatus(user),
      DEPARTMENT_REGISTRATION_STATUS.UNREGISTERED
    )
    assert.equal(isDepartmentUserRegistered(user), false)
  })
})
