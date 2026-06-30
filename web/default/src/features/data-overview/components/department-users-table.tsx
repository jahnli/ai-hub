import { useMemo, useState, useCallback } from 'react'
import type { ColumnDef, PaginationState, OnChangeFn, SortingState } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import {
  userIdColumn,
  userNameColumn,
  userQuotaColumn,
  userCostColumn,
  userTokensColumn,
  userRequestsColumn,
  userModelColumn,
  userDepartmentColumn,
  userJobLevelColumn,
  userJoinDateColumn,
  userLastLoginColumn,
  userCreatedAtColumn,
  userRoleColumn,
  userStatusColumn,
  userGroupColumn,
} from '@/features/users/components/shared-user-columns'
import { getDepartmentUsers, getDepartmentUserRankings } from '../api'
import { UserConsumptionCharts } from './user-consumption-charts'
import type { DepartmentUser } from '../types'

function useDepartmentUsersColumns(): ColumnDef<DepartmentUser>[] {
  const { t } = useTranslation()
  return useMemo(
    () => [
      userIdColumn<DepartmentUser>(t),
      userNameColumn<DepartmentUser>(t),
      userQuotaColumn<DepartmentUser>(t),
      userCostColumn<DepartmentUser>(t, { accessor: 'total_amount_cny' }),
      userTokensColumn<DepartmentUser>(t, { accessor: 'total_tokens' }),
      userRequestsColumn<DepartmentUser>(t, { accessor: 'total_requests' }),
      userModelColumn<DepartmentUser>(t, { accessor: 'common_model', variant: 'badge' }),
      userDepartmentColumn<DepartmentUser>(t),
      userJobLevelColumn<DepartmentUser>(t),
      userJoinDateColumn<DepartmentUser>(t),
      userLastLoginColumn<DepartmentUser>(t),
      userCreatedAtColumn<DepartmentUser>(t),
      userRoleColumn<DepartmentUser>(t),
      userStatusColumn<DepartmentUser>(t, { showRequestCount: true, requestCountAccessor: 'total_requests' as keyof DepartmentUser }),
      userGroupColumn<DepartmentUser>(t, { withBadgeCell: true }),
    ],
    [t]
  )
}

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
  const columns = useDepartmentUsersColumns()

  const [pagination, setPagination] = usePagination()
  const [sorting, setSorting] = useState<SortingState>([])

  const sortParam = sorting[0]
  const sortBy = sortParam ? (DEPT_COLUMN_SORT_MAP[sortParam.id] ?? '') : ''
  const sortOrder = sortParam ? (sortParam.desc ? 'desc' : 'asc') : ''

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
