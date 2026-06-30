import { useMemo, useState, useCallback } from 'react'
import type { ColumnDef, PaginationState, OnChangeFn } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota, formatTimestamp } from '@/lib/format'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GroupBadge } from '@/components/group-badge'
import { LongText } from '@/components/long-text'
import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import {
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import {
  USER_STATUSES,
  USER_ROLES,
} from '@/features/users/constants'
import { parseCustomFields, CUSTOM_FIELD_KEYS } from '@/features/users/types'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { UserProfileHoverCard } from '@/features/users/components/user-profile-hover-card'
import { getDepartmentUsers, getDepartmentUserRankings } from '../api'
import { UserConsumptionCharts } from './user-consumption-charts'
import type { DepartmentUser } from '../types'

function getQuotaProgressColor(usedPercentage: number): string {
  if (usedPercentage >= 90) return '[&_[data-slot=progress-indicator]]:bg-rose-500'
  if (usedPercentage >= 70) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
}

function formatAmountCny(value: number | undefined): string {
  const amount = value ?? 0
  return `¥${Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function formatTokens(tokens: number | undefined): string {
  const value = tokens ?? 0
  if (value <= 0) return '-'
  if (value >= 100_000_000) {
    return `${Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value / 100_000_000)}亿`
  }
  return `${Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value / 1_000_000)}M`
}

function formatRequests(requests: number | undefined): string {
  const value = requests ?? 0
  if (value <= 0) return '-'
  if (value >= 10_000) {
    return `${Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value / 10_000)}万次`
  }
  return Intl.NumberFormat().format(value)
}

function useDepartmentUsersColumns(): ColumnDef<DepartmentUser>[] {
  const { t } = useTranslation()
  return useMemo(
    () => [
      {
        accessorKey: 'id',
        header: t('ID'),
        cell: ({ row }) => (
          <TableId value={row.getValue('id') as number} className='w-[60px]' />
        ),
        size: 80,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'username',
        header: t('Username'),
        cell: ({ row }) => {
          const username = row.getValue('username') as string
          const displayName = row.original.display_name
          const remark = row.original.remark
          const avatarUrl = row.original.avatar_url
          const primaryName = displayName || username
          const avatarFallback = getUserAvatarFallback(primaryName)
          const avatarFallbackStyle = getUserAvatarStyle(primaryName)

          return (
            <div className='flex w-[150px] min-w-0 items-center gap-2'>
              <UserProfileHoverCard user={row.original as unknown as Parameters<typeof UserProfileHoverCard>[0]['user']}>
                <Avatar size='sm' className='shrink-0'>
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={primaryName} />
                  )}
                  <AvatarFallback
                    className='text-xs font-medium text-white'
                    style={avatarFallbackStyle}
                  >
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
              </UserProfileHoverCard>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <LongText className='max-w-full font-medium'>
                  {primaryName}
                </LongText>
                {(displayName && displayName !== username) || remark ? (
                  <div className='text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs'>
                    {displayName && displayName !== username ? (
                      <LongText className='min-w-0 flex-1'>
                        {username}
                      </LongText>
                    ) : null}
                    {remark ? (
                      <Tooltip>
                        <TooltipTrigger render={<span className='min-w-0 shrink-0' />}>
                          <LongText className='max-w-[60px]'>{remark}</LongText>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className='text-xs'>{remark}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )
        },
        enableHiding: false,
        size: 190,
        meta: { mobileTitle: true },
      },
      {
        id: 'quota',
        accessorKey: 'quota',
        header: t('Used Quota / Total Quota'),
        cell: ({ row }) => {
          const user = row.original
          const used = user.sub_quota_used ?? 0
          const total = user.sub_quota_total ?? 0
          const remaining = total - used

          if (total === 0) {
            return <span className='text-muted-foreground text-sm'>-</span>
          }

          const usedPercentage = Math.min((used / total) * 100, 100)

          return (
            <Tooltip>
              <TooltipTrigger
                render={<div className='w-[160px] cursor-help space-y-1' />}
              >
                <div className='flex justify-between text-xs'>
                  <span className='font-medium tabular-nums'>
                    {formatQuota(used)}
                  </span>
                  <span className='text-muted-foreground tabular-nums'>
                    {formatQuota(total)}
                  </span>
                </div>
                <Progress
                  value={usedPercentage}
                  className={cn('h-1.5', getQuotaProgressColor(usedPercentage))}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className='space-y-1 text-xs'>
                  <div>
                    {t('Used:')} {formatQuota(used)}
                  </div>
                  <div>
                    {t('Remaining:')} {formatQuota(remaining)}
                  </div>
                  <div>
                    {t('Total:')} {formatQuota(total)}
                  </div>
                  <div>
                    {t('Percentage:')} {usedPercentage.toFixed(1)}%
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        },
        size: 200,
      },
      {
        accessorKey: 'total_amount_cny',
        header: t('Total Cost'),
        cell: ({ row }) => (
          <span className='text-sm font-medium tabular-nums'>
            {formatAmountCny(row.original.total_amount_cny)}
          </span>
        ),
        size: 140,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'total_tokens',
        header: t('Tokens'),
        cell: ({ row }) => (
          <span className='text-sm tabular-nums'>
            {formatTokens(row.original.total_tokens)}
          </span>
        ),
        size: 120,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'total_requests',
        header: t('Requests'),
        cell: ({ row }) => (
          <span className='text-sm tabular-nums'>
            {formatRequests(row.original.total_requests)}
          </span>
        ),
        size: 120,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'common_model',
        header: t('Common Model'),
        cell: ({ row }) => {
          const modelName = row.original.common_model
          if (!modelName) {
            return <span className='text-muted-foreground text-sm'>-</span>
          }
          return <ModelBadge modelName={modelName} />
        },
        size: 190,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'department_name',
        header: t('Department'),
        cell: ({ row }) => {
          const dept = row.getValue('department_name') as string | undefined
          if (!dept) return <span className='text-muted-foreground text-sm'>-</span>
          const parts = dept.split('/')
          const firstLevel = parts[0]
          const rest = parts.slice(1).join('/')
          return (
            <div className='text-sm leading-snug'>
              <div>{firstLevel}</div>
              {rest && (
                <div className='text-muted-foreground !text-xs'>{rest}</div>
              )}
            </div>
          )
        },
        size: 180,
        meta: { mobileHidden: true },
      },
      {
        id: 'job_level',
        header: t('Job Level'),
        cell: ({ row }) => {
          const customFields = parseCustomFields(row.original.custom_field_values)
          const level = customFields?.[CUSTOM_FIELD_KEYS.JOB_LEVEL]
          return (
            <span className='text-sm'>
              {level || '-'}
            </span>
          )
        },
        size: 120,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'join_date',
        header: t('Join Date'),
        cell: ({ row }) => {
          const date = row.getValue('join_date') as string | undefined
          return (
            <span className='text-sm'>
              {date || '-'}
            </span>
          )
        },
        size: 120,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'last_login_at',
        header: t('Last Login'),
        cell: ({ row }) => {
          const ts = row.getValue('last_login_at') as number | undefined
          return (
            <span className='text-sm'>
              {ts ? formatTimestamp(ts) : '-'}
            </span>
          )
        },
        size: 180,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'created_at',
        header: t('Created At'),
        cell: ({ row }) => {
          const ts = row.getValue('created_at') as number | undefined
          return (
            <span className='text-sm'>
              {ts ? formatTimestamp(ts) : '-'}
            </span>
          )
        },
        size: 160,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'role',
        header: t('Role'),
        cell: ({ row }) => {
          const role = row.getValue('role') as number
          const config = USER_ROLES[role as keyof typeof USER_ROLES]
          if (!config) return <span className='text-muted-foreground text-sm'>-</span>
          const Icon = config.icon
          return (
            <div className='flex items-center gap-1.5'>
              <Icon className='text-muted-foreground size-3.5' />
              <span className='text-sm'>{t(config.labelKey)}</span>
            </div>
          )
        },
        size: 120,
        meta: { mobileHidden: true },
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        cell: ({ row }) => {
          const user = row.original
          const deleted = user.DeletedAt != null
          if (deleted) {
            const cfg = USER_STATUSES[-1 as keyof typeof USER_STATUSES]
            return cfg ? (
              <StatusBadge
                label={t(cfg.labelKey)}
                variant={cfg.variant}
                copyable={false}
              />
            ) : null
          }
          const status = row.getValue('status') as number
          const cfg = USER_STATUSES[status as keyof typeof USER_STATUSES]
          if (!cfg) return null
          return (
            <StatusBadge
              label={t(cfg.labelKey)}
              variant={cfg.variant}
              copyable={false}
            />
          )
        },
        size: 100,
      },
      {
        accessorKey: 'group',
        header: t('Group'),
        cell: ({ row }) => {
          const group = row.getValue('group') as string
          return <GroupBadge group={group} />
        },
        size: 100,
        meta: { mobileHidden: true },
      },
    ],
    [t]
  )
}

interface DepartmentUsersTableProps {
  departmentId: string
  startTimestamp: number
  endTimestamp: number
}

export function DepartmentUsersTable({
  departmentId,
  startTimestamp,
  endTimestamp,
}: DepartmentUsersTableProps) {
  const { t } = useTranslation()
  const columns = useDepartmentUsersColumns()

  const [pagination, setPagination] = usePagination()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'department',
      'users',
      departmentId,
      startTimestamp,
      endTimestamp,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      getDepartmentUsers({
        department_id: departmentId,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
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
    manualPagination: true,
    manualFiltering: true,
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
