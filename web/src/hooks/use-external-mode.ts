import { useStatus } from './use-status'

export function useExternalMode(): boolean {
  const { status } = useStatus()
  return status?.external_mode_enabled === true
}
