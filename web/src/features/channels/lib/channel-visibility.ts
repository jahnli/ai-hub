export const CHANNEL_SENSITIVE_MASK = '••••'

export function getChannelSensitiveMask(
  sensitiveVisible: boolean,
  demoMode: boolean
): string | undefined {
  if (demoMode || !sensitiveVisible) return CHANNEL_SENSITIVE_MASK
  return undefined
}
