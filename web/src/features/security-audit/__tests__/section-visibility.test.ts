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
