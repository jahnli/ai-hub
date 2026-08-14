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
