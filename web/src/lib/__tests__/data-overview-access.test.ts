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

  test('BP roles pass only with a configured bp_level', () => {
    assert.equal(canAccessDataOverview({ role: ROLE.BU_BP, bp_level: 2 }), true)
    assert.equal(canAccessDataOverview({ role: ROLE.CENTER_BP, bp_level: 1 }), true)
    assert.equal(canAccessDataOverview({ role: ROLE.BU_BP, bp_level: 0 }), false)
    assert.equal(canAccessDataOverview({ role: ROLE.CENTER_BP, bp_level: 0 }), false)
    assert.equal(canAccessDataOverview({ role: ROLE.BU_BP }), false)
  })

  test('BP with bp_level 0 is denied even when leading departments', () => {
    assert.equal(
      canAccessDataOverview({ role: ROLE.BU_BP, bp_level: 0, is_dept_leader: true }),
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
