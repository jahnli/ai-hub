import { DEMO_MODE_MASK } from '@/lib/demo-mode'

const SENSITIVE_CHANNEL_MASK = '••••'

interface UsageLogChannelDisplay {
  id: string
  name: string | null
  tooltip: string
}

export function getUsageLogChannelDisplay(
  channelName: string | null | undefined,
  channelId: number,
  sensitiveVisible: boolean,
  demoMode: boolean
): UsageLogChannelDisplay {
  const channelIdDisplay = demoMode ? DEMO_MODE_MASK : `#${channelId}`
  if (!channelName) {
    return { id: channelIdDisplay, name: null, tooltip: channelIdDisplay }
  }

  if (demoMode) {
    return {
      id: channelIdDisplay,
      name: DEMO_MODE_MASK,
      tooltip: `${DEMO_MODE_MASK} ${channelIdDisplay}`,
    }
  }

  if (!sensitiveVisible) {
    return {
      id: channelIdDisplay,
      name: SENSITIVE_CHANNEL_MASK,
      tooltip: channelIdDisplay,
    }
  }

  return {
    id: channelIdDisplay,
    name: channelName,
    tooltip: `${channelName} ${channelIdDisplay}`,
  }
}
