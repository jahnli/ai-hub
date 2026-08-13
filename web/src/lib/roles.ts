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
import { t } from 'i18next'

export const ROLE = {
  GUEST: 0,
  USER: 1,
  BU_BP: 2,
  CENTER_BP: 3,
  ADMIN: 10,
  SUPER_ADMIN: 100,
} as const

export type RoleValue = (typeof ROLE)[keyof typeof ROLE]

const DEFAULT_ROLE = ROLE.GUEST

const ROLE_LABEL_KEYS: Record<RoleValue, string> = {
  [ROLE.SUPER_ADMIN]: 'Super Admin',
  [ROLE.ADMIN]: 'Admin',
  [ROLE.CENTER_BP]: 'Center BP',
  [ROLE.BU_BP]: 'AI BP',
  [ROLE.USER]: 'User',
  [ROLE.GUEST]: 'Guest',
}

const ROLE_ICONS: Record<RoleValue, string> = {
  [ROLE.SUPER_ADMIN]: '👑',
  [ROLE.ADMIN]: '🏅',
  [ROLE.CENTER_BP]: '📊',
  [ROLE.BU_BP]: '📈',
  [ROLE.USER]: '🧑‍💼',
  [ROLE.GUEST]: '👁️',
}

export function getRoleLabelKey(role?: number): string {
  return ROLE_LABEL_KEYS[role as RoleValue] ?? ROLE_LABEL_KEYS[DEFAULT_ROLE]
}

export function getRoleLabel(role?: number): string {
  return t(getRoleLabelKey(role))
}

export function getRoleIcon(role?: number): string {
  return ROLE_ICONS[role as RoleValue] ?? ROLE_ICONS[DEFAULT_ROLE]
}

export interface DataOverviewAccessUser {
  role: number
  bp_level?: number
  is_dept_leader?: boolean
}

/**
 * Decides whether a user may enter the data overview. Admins and root always
 * can; BP roles additionally need a configured bp_level; other users can enter
 * only when they lead at least one department.
 */
export function canAccessDataOverview(
  user: DataOverviewAccessUser | null | undefined
): boolean {
  if (!user) return false
  if (user.role >= ROLE.ADMIN) return true
  const isBP = user.role === ROLE.BU_BP || user.role === ROLE.CENTER_BP
  if (isBP) return (user.bp_level ?? 0) > 0
  return user.is_dept_leader === true
}
