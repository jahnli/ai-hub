import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  canAccessDataOverview,
  ROLE,
  type DataOverviewAccessUser,
} from '../roles'

describe('data overview entry access', () => {
  test('admins and root always pass', () => {
    assert.equal(canAccessDataOverview({ role: ROLE.ADMIN }), true)
    assert.equal(canAccessDataOverview({ role: ROLE.SUPER_ADMIN }), true)
  })

  test('BP role passes only with configured visible departments', () => {
    assert.equal(
      canAccessDataOverview({ role: ROLE.BU_BP, overview_dept_ids: ['dept:1:team'] }),
      true
    )
    assert.equal(
      canAccessDataOverview({ role: ROLE.BU_BP, overview_dept_ids: ['dept:1:team', 'dept:1:bu'] }),
      true
    )
    assert.equal(canAccessDataOverview({ role: ROLE.BU_BP, overview_dept_ids: [] }), false)
    assert.equal(canAccessDataOverview({ role: ROLE.BU_BP }), false)
  })

  test('BP without configured departments is denied even when leading departments', () => {
    assert.equal(
      canAccessDataOverview({ role: ROLE.BU_BP, overview_dept_ids: [], is_dept_leader: true }),
      false
    )
  })

  test('common users pass only as department leaders', () => {
    assert.equal(canAccessDataOverview({ role: ROLE.USER, is_dept_leader: true }), true)
    assert.equal(canAccessDataOverview({ role: ROLE.USER }), false)
  })

  test('null user is denied', () => {
    assert.equal(canAccessDataOverview(null as unknown as DataOverviewAccessUser), false)
    assert.equal(canAccessDataOverview(undefined), false)
  })
})
