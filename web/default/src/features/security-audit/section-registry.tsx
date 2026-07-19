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
import { createSectionRegistry } from '@/features/system-settings/utils/section-registry'

/**
 * Security audit page section definitions.
 * Add new audit capabilities here as additional tabs.
 */
const SECURITY_AUDIT_SECTIONS = [
  {
    id: 'off-hours',
    titleKey: 'Off-Hours Requests',
    build: () => null, // Content is rendered directly in the page component
  },
] as const

export type SecurityAuditSectionId =
  (typeof SECURITY_AUDIT_SECTIONS)[number]['id']

const securityAuditRegistry = createSectionRegistry<
  SecurityAuditSectionId,
  Record<string, never>,
  []
>({
  sections: SECURITY_AUDIT_SECTIONS,
  defaultSection: 'off-hours',
  basePath: '/security-audit',
  urlStyle: 'path',
})

export const SECURITY_AUDIT_SECTION_IDS = securityAuditRegistry.sectionIds
export const SECURITY_AUDIT_DEFAULT_SECTION =
  securityAuditRegistry.defaultSection

/** Type guard for validating section IDs without casting. */
export function isSecurityAuditSectionId(
  s: string
): s is SecurityAuditSectionId {
  return (SECURITY_AUDIT_SECTION_IDS as readonly string[]).includes(s)
}
