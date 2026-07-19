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
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAllLogs } from '@/features/usage-logs/api'
import { useCommonLogsColumns } from '@/features/usage-logs/components/columns/common-logs-columns'
import { RequestMessagesProvider } from '@/features/usage-logs/components/request-messages-provider'
import { UsageLogsProvider } from '@/features/usage-logs/components/usage-logs-provider'
import dayjs from '@/lib/dayjs'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import type { OffHoursDetailTarget } from '../types'

interface OffHoursDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: OffHoursDetailTarget | null
}

export function OffHoursDetailDialog(props: OffHoursDetailDialogProps) {
  const { t } = useTranslation()

  if (!props.target) return null

  const windowLabel = `${dayjs.unix(props.target.windowStart).format('HH:mm')} - ${dayjs
    .unix(props.target.windowEnd)
    .format('HH:mm')}`

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-2rem)] w-[min(1360px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-[calc(100vw-2rem)]'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>
            {t('Usage Logs')} - {props.target.displayName} · {props.target.date}{' '}
            · {windowLabel}
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 overflow-y-auto pt-2 pr-1'>
          <OffHoursLogsSection target={props.target} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Day-level usage log detail. Reuses the exact common usage-log columns so the
 * table matches the Usage Logs page, scoped to the user's audit window.
 */
function OffHoursLogsSection(props: { target: OffHoursDetailTarget }) {
  const { t } = useTranslation()
  const currentUserRole = useAuthStore((state) => state.auth.user?.role)
  const isSuperAdmin = (currentUserRole ?? 0) >= ROLE.SUPER_ADMIN
  const columns = useCommonLogsColumns(true, {
    canFetchUserDetails: isSuperAdmin,
  })
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'security-audit',
      'off-hours-logs',
      props.target.username,
      props.target.windowStart,
      props.target.windowEnd,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      getAllLogs({
        type: 2,
        username: props.target.username,
        start_timestamp: props.target.windowStart,
        // 后端 end_timestamp 为含端(<=),窗口为右开区间,故减一秒
        end_timestamp: props.target.windowEnd - 1,
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      }),
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
      <RequestMessagesProvider
        requestIds={requestIds}
        canViewRequestContent={isSuperAdmin}
        isAdmin={isSuperAdmin}
      >
        <DataTablePage
          table={table}
          columns={columns as ColumnDef<Record<string, unknown>>[]}
          isLoading={isLoading}
          isFetching={isFetching}
          emptyTitle={t('No Logs Found')}
          emptyDescription={t('No usage logs in this time range.')}
          skeletonKeyPrefix='security-audit-detail-logs'
          applyHeaderSize
          toolbarProps={null}
          className='h-[min(52vh,560px)] min-h-[280px]'
          paginationInFooter={false}
          tableClassName='rounded-none border-0 [scrollbar-gutter:stable] [&_[data-slot=table]]:min-w-[1120px] [&_[data-slot=table]]:text-[13px] [&_[data-slot=table]_td]:text-[13px] [&_[data-slot=table]_td_*]:text-[13px] [&_[data-slot=table]_th]:text-[13px] [&_[data-slot=table]_th_*]:text-[13px]'
        />
      </RequestMessagesProvider>
    </UsageLogsProvider>
  )
}
