import { useState, useCallback, useMemo } from 'react'
import type { PaginationState, OnChangeFn, SortingState, ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import { useSharedUserColumns } from '@/features/users/components/shared-user-columns'
import { getDepartmentUsers, getDepartmentUserRankings } from '../api'
import { UserConsumptionCharts } from './user-consumption-charts'
import { UserStatsDialog } from './user-stats-dialog'
import type { DepartmentUser } from '../types'

interface DepartmentUsersTableProps {
  departmentId: string
  startTimestamp: number
  endTimestamp: number
}

const DEPT_COLUMN_SORT_MAP: Record<string, string> = {
  quota: 'sub_quota_used',
  total_amount_cny: 'total_amount_cny',
  total_tokens: 'total_tokens',
  total_requests: 'total_requests',
  id: 'id',
  username: 'username',
  used_quota: 'used_quota',
  created_at: 'created_at',
  role: 'role',
  status: 'status',
}

export function DepartmentUsersTable({
  departmentId,
  startTimestamp,
  endTimestamp,
}: DepartmentUsersTableProps) {
  const { t } = useTranslation()
  const baseColumns = useSharedUserColumns<DepartmentUser>({
    costAccessor: 'total_amount_cny',
    tokensAccessor: 'total_tokens',
    requestsAccessor: 'total_requests',
    modelAccessor: 'common_model',
    requestCountAccessor: 'total_requests',
    quotaHeaderDescription: t('Used quota and total quota data are fixed to the current calendar month and are not affected by the selected time range.'),
  })

  const [statsUser, setStatsUser] = useState<DepartmentUser | null>(null)

  const columns = useMemo<ColumnDef<DepartmentUser>[]>(() => [
    ...baseColumns,
    {
      id: 'actions',
      header: '',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='sm'
          className='h-7 gap-1 px-2 text-xs'
          onClick={() => setStatsUser(row.original)}
        >
          <BarChart3 className='size-3.5' />
          {t('Statistics')}
        </Button>
      ),
    },
  ], [baseColumns, t])

  const [pagination, setPagination] = usePagination()
  const [sorting, setSorting] = useState<SortingState>([])

  const sortParam = sorting[0]
  const sortBy = sortParam ? (DEPT_COLUMN_SORT_MAP[sortParam.id] ?? '') : ''
  let sortOrder = ''
  if (sortParam) {
    sortOrder = sortParam.desc ? 'desc' : 'asc'
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'department',
      'users',
      departmentId,
      startTimestamp,
      endTimestamp,
      pagination.pageIndex,
      pagination.pageSize,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getDepartmentUsers({
        department_id: departmentId,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        sort_by: sortBy || undefined,
        sort_order: sortOrder || undefined,
      }),
    enabled: !!departmentId,
    staleTime: 60 * 1000,
  })

  const users = data?.data?.items ?? []
  const total = data?.data?.total ?? 0

  const { table } = useDataTable({
    data: users,
    columns,
    enableRowSelection: false,
    pagination,
    onPaginationChange: setPagination,
    sorting,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    totalCount: total,
  })

  const rankingsQuery = useQuery({
    queryKey: ['department', 'user-rankings', departmentId, startTimestamp, endTimestamp],
    queryFn: () =>
      getDepartmentUserRankings({
        department_id: departmentId,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
      }),
    enabled: !!departmentId,
    staleTime: 60 * 1000,
  })

  return (
    <Card className='mt-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Users className='text-primary size-5' />
          {t('Department Users')}
        </CardTitle>
      </CardHeader>
      <CardContent className='px-4 pb-4 pt-0'>
        <DataTablePage
          table={table}
          columns={columns}
          isLoading={isLoading}
          isFetching={isFetching}
          emptyTitle={t('No Users Found')}
          emptyDescription={t('No users in this department.')}
          skeletonKeyPrefix='dept-users-skeleton'
          applyHeaderSize
          toolbarProps={null}
          fixedHeight={false}
          paginationInFooter={false}
          tableClassName='border-0 rounded-none'
        />
        {rankingsQuery.data?.data && rankingsQuery.data.data.length > 0 && (
          <div className='pt-8'>
            <UserConsumptionCharts data={rankingsQuery.data.data} />
          </div>
        )}
      </CardContent>
      <UserStatsDialog
        key={
          statsUser
            ? `${statsUser.id}-${startTimestamp}-${endTimestamp}`
            : 'closed'
        }
        open={!!statsUser}
        onOpenChange={(open) => {
          if (!open) setStatsUser(null)
        }}
        user={statsUser}
        initialStartTimestamp={startTimestamp}
        initialEndTimestamp={endTimestamp}
      />
    </Card>
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
