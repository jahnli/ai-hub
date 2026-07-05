import { useState, useCallback } from 'react'
import type { PaginationState, OnChangeFn, ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import { useCommonLogsColumns } from '@/features/usage-logs/components/columns/common-logs-columns'
import { RequestMessagesProvider } from '@/features/usage-logs/components/request-messages-provider'
import { UsageLogsProvider } from '@/features/usage-logs/components/usage-logs-provider'
import { getAllLogs } from '@/features/usage-logs/api'

interface UserLogsSectionProps {
  username: string
  startTimestamp: number
  endTimestamp: number
}

export function UserLogsSection(props: UserLogsSectionProps) {
  const { t } = useTranslation()
  const columns = useCommonLogsColumns(true)
  const [pagination, setPagination] = usePagination()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'user-stats-logs',
      props.username,
      props.startTimestamp,
      props.endTimestamp,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      getAllLogs({
        username: props.username,
        start_timestamp: props.startTimestamp,
        end_timestamp: props.endTimestamp,
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      }),
    enabled: !!props.username,
    staleTime: 60 * 1000,
  })

  const logs = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const requestIds = (logs as Array<{ request_id?: string }>)
    .map((log) => log.request_id ?? '')
    .filter(Boolean)

  const { table } = useDataTable({
    data: logs as Record<string, unknown>[],
    columns: columns as ColumnDef<Record<string, unknown>>[],
    enableRowSelection: false,
    pagination,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualFiltering: true,
    totalCount: total,
  })

  return (
    <UsageLogsProvider>
      <RequestMessagesProvider requestIds={requestIds} isAdmin>
        <div className='space-y-3 overflow-hidden'>
          <h3 className='flex items-center gap-2 text-sm font-medium'>
            <ScrollText className='text-primary size-4' />
            {t('Recent Usage Logs')}
          </h3>
          <DataTablePage
            table={table}
            columns={columns as ColumnDef<Record<string, unknown>>[]}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyTitle={t('No Logs Found')}
            emptyDescription={t('No usage logs in this time range.')}
            skeletonKeyPrefix='user-stats-logs-skeleton'
            applyHeaderSize
            toolbarProps={null}
            className='h-[min(42vh,420px)] min-h-[260px]'
            paginationInFooter={false}
            tableClassName='rounded-none border-0 [scrollbar-gutter:stable] [&_[data-slot=table]]:min-w-[1120px] [&_[data-slot=table]]:text-[13px] [&_[data-slot=table]_td]:text-[13px] [&_[data-slot=table]_td_*]:text-[13px] [&_[data-slot=table]_th]:text-[13px] [&_[data-slot=table]_th_*]:text-[13px]'
          />
        </div>
      </RequestMessagesProvider>
    </UsageLogsProvider>
  )
}

function usePagination(): [PaginationState, OnChangeFn<PaginationState>] {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      setPagination((prev) =>
        typeof updater === 'function' ? updater(prev) : updater
      )
    },
    []
  )
  return [pagination, onPaginationChange]
}