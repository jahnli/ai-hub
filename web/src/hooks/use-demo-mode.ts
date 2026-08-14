import { isDemoModeEnabled } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth-store'

export function useDemoMode(): boolean {
  return useAuthStore((state) => isDemoModeEnabled(state.auth.user?.setting))
}
