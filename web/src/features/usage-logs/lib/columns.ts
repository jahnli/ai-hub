/**
 * Column definitions factory
 */
import type { ColumnDef } from '@tanstack/react-table'

import { useCommonLogsColumns } from '../components/columns/common-logs-columns'
import { useDrawingLogsColumns } from '../components/columns/drawing-logs-columns'
import { useTaskLogsColumns } from '../components/columns/task-logs-columns'
import type { LogCategory } from '../types'

interface UseColumnsByCategoryOptions {
  canFetchUserDetails?: boolean
  showUserColumn?: boolean
  showChannelColumn?: boolean
}

/**
 * Get column definitions based on log category
 * Returns any[] due to different log types (UsageLog, MjProxy log, TaskLog)
 */
export function useColumnsByCategory(
  logCategory: LogCategory,
  isAdmin: boolean,
  options: UseColumnsByCategoryOptions = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ColumnDef<any>[] {
  const commonColumns = useCommonLogsColumns(isAdmin, options)
  const drawingColumns = useDrawingLogsColumns(
    isAdmin,
    options.showChannelColumn
  )
  const taskColumns = useTaskLogsColumns(isAdmin, options.showChannelColumn)

  switch (logCategory) {
    case 'common':
      return commonColumns
    case 'drawing':
      return drawingColumns
    case 'task':
      return taskColumns
    default:
      return commonColumns
  }
}
