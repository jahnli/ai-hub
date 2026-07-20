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
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'

import { getOffHoursUsage } from '../api'
import type { AuditRow, OffHoursDetailTarget, OffHoursUserRow } from '../types'
import { useOffHoursColumns } from './off-hours-columns'
import { OffHoursDetailDialog } from './off-hours-detail-dialog'

const route = getRouteApi('/_authenticated/security-audit/$section')

function buildAuditRows(items: OffHoursUserRow[]): AuditRow[] {
  return items.map((user) => ({
    id: `u-${user.user_id}`,
    kind: 'user' as const,
    user,
    children:
      user.day_rows?.length > 1
        ? user.day_rows.map((day) => ({
            id: `u-${user.user_id}-${day.date}`,
            kind: 'day' as const,
            user,
            day,
          }))
        : undefined,
  }))
}

interface OffHoursTableProps {
  startTimestamp: number
  endTimestamp: number
  username: string
  enabled: boolean
}

export function OffHoursTable(props: OffHoursTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = route.useParams()
  const search = route.useSearch()

  const pagination: PaginationState = {
    pageIndex: (search.page ?? 1) - 1,
    pageSize: search.pageSize ?? 20,
  }

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      void navigate({
        to: '/security-audit/$section',
        params,
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        }),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, params, pagination.pageIndex, pagination.pageSize]
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'security-audit',
      'off-hours',
      props.startTimestamp,
      props.endTimestamp,
      props.username,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      getOffHoursUsage({
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        start_timestamp: props.startTimestamp,
        end_timestamp: props.endTimestamp,
        username: props.username || undefined,
      }),
    enabled: props.enabled,
    staleTime: 60 * 1000,
  })

  const items = useMemo(() => data?.data?.items ?? [], [data])
  const total = data?.data?.total ?? 0
  const auditRows = useMemo(() => buildAuditRows(items), [items])

  const [detailTarget, setDetailTarget] = useState<OffHoursDetailTarget | null>(
    null
  )
  const [detailOpen, setDetailOpen] = useState(false)
  const handleViewDetail = useCallback((target: OffHoursDetailTarget) => {
    setDetailTarget(target)
    setDetailOpen(true)
  }, [])

  const columns = useOffHoursColumns(handleViewDetail)

  const { table } = useDataTable({
    data: auditRows,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.children,
    withExpandedRowModel: true,
    pagination,
    onPaginationChange,
    manualPagination: true,
    manualFiltering: true,
    totalCount: total,
  })

  return (
    <>
      <DataTablePage
        table={table}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyTitle={t('No off-hours requests')}
        emptyDescription={t(
          'No requests were recorded during the audit window in this time range.'
        )}
        skeletonKeyPrefix='security-audit-off-hours'
        toolbarProps={null}
      />
      <OffHoursDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        target={detailTarget}
      />
    </>
  )
}
