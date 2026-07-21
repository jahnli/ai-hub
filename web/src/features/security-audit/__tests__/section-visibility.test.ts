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

import { getVisibleSecurityAuditSectionIds } from '../audit-visibility'

const sectionIds = ['off-hours', 'image-studio'] as const

describe('security audit section visibility', () => {
  test('shows both audit sections when both settings are enabled', () => {
    assert.deepEqual(
      getVisibleSecurityAuditSectionIds(sectionIds, true, true),
      ['off-hours', 'image-studio']
    )
  })

  test('hides image audit when its setting is disabled', () => {
    assert.deepEqual(
      getVisibleSecurityAuditSectionIds(sectionIds, true, false),
      ['off-hours']
    )
  })

  test('hides off-hours audit when its setting is disabled', () => {
    assert.deepEqual(
      getVisibleSecurityAuditSectionIds(sectionIds, false, true),
      ['image-studio']
    )
  })

  test('returns no sections when all audit settings are disabled', () => {
    assert.deepEqual(
      getVisibleSecurityAuditSectionIds(sectionIds, false, false),
      []
    )
  })
})
