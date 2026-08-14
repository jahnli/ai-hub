import { DEMO_MODE_MASK } from '@/lib/demo-mode'

const SENSITIVE_CHANNEL_MASK = '••••'

interface UsageLogChannelDisplay {
  name: string | null
  tooltip: string
}

export function getUsageLogChannelDisplay(
  channelName: string | null | undefined,
  channelId: number,
  sensitiveVisible: boolean,
  demoMode: boolean
): UsageLogChannelDisplay {
  const channelIdDisplay = `#${channelId}`
  if (!channelName) {
    return { name: null, tooltip: channelIdDisplay }
  }

  if (demoMode) {
    return {
      name: DEMO_MODE_MASK,
      tooltip: `${DEMO_MODE_MASK} ${channelIdDisplay}`,
    }
  }

  if (!sensitiveVisible) {
    return { name: SENSITIVE_CHANNEL_MASK, tooltip: channelIdDisplay }
  }

  return {
    name: channelName,
    tooltip: `${channelName} ${channelIdDisplay}`,
  }
}
