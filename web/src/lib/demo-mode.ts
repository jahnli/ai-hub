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
import type { AuthUser } from '@/stores/auth-store'

export const DEMO_MODE_MASK = '*'
export const DEMO_MODE_USERNAME_MASK = '***'

export function getDemoModeUsername(
  username: string,
  demoMode: boolean
): string {
  return demoMode ? DEMO_MODE_USERNAME_MASK : username
}

export function isDemoModeEnabled(
  setting: AuthUser['setting'] | undefined
): boolean {
  if (!setting) return false

  if (typeof setting === 'string') {
    try {
      const parsed = JSON.parse(setting) as unknown
      return isDemoModeEnabled(
        typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : undefined
      )
    } catch {
      return false
    }
  }

  return setting.demo_mode === true
}
