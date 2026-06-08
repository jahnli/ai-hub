import { useMemo } from 'react';
import { timestamp2string } from '../../helpers';
import { getLogsColumns } from '../../components/table/usage-logs/UsageLogsColumnDefs';

export const RECENT_USAGE_LOG_COLUMN_KEYS = {
  TIME: 'time',
  CHANNEL: 'channel',
  USERNAME: 'username',
  TOKEN: 'token',
  GROUP: 'group',
  TYPE: 'type',
  MODEL: 'model',
  USE_TIME: 'use_time',
  PROMPT: 'prompt',
  COMPLETION: 'completion',
  COST: 'cost',
  RETRY: 'retry',
  IP: 'ip',
  DETAILS: 'details',
  MESSAGES: 'messages',
};

export const DEFAULT_RECENT_USAGE_LOG_VISIBLE_COLUMNS = {
  [RECENT_USAGE_LOG_COLUMN_KEYS.TIME]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.USERNAME]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.MODEL]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.USE_TIME]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.PROMPT]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.COMPLETION]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.COST]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.TYPE]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.TOKEN]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.GROUP]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.IP]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.DETAILS]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.MESSAGES]: true,
  [RECENT_USAGE_LOG_COLUMN_KEYS.CHANNEL]: false,
  [RECENT_USAGE_LOG_COLUMN_KEYS.RETRY]: false,
};

export function useRecentUsageLogsTable({
  logs,
  t,
  copyText,
  visibleColumns = DEFAULT_RECENT_USAGE_LOG_VISIBLE_COLUMNS,
  showUserInfoFunc = () => {},
  openChannelAffinityUsageCacheModal = () => {},
  isAdminUser = true,
  billingDisplayMode = 'price',
  canViewMessages = false,
  viewMessageDetail,
}) {
  const dataSource = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    return logs.map((log) => ({
      ...log,
      timestamp2string: timestamp2string(log.created_at),
      key: log.id,
    }));
  }, [logs]);

  const columns = useMemo(() => {
    const allColumns = getLogsColumns({
      t,
      COLUMN_KEYS: RECENT_USAGE_LOG_COLUMN_KEYS,
      copyText,
      showUserInfoFunc,
      openChannelAffinityUsageCacheModal,
      isAdminUser,
      billingDisplayMode,
      canViewMessages,
      viewMessageDetail,
    });
    return allColumns.filter((column) => {
      if (column.key === RECENT_USAGE_LOG_COLUMN_KEYS.MESSAGES && !canViewMessages) {
        return false;
      }
      return visibleColumns[column.key];
    });
  }, [
    t,
    copyText,
    visibleColumns,
    showUserInfoFunc,
    openChannelAffinityUsageCacheModal,
    isAdminUser,
    billingDisplayMode,
    canViewMessages,
    viewMessageDetail,
  ]);

  return { columns, dataSource };
}
