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
