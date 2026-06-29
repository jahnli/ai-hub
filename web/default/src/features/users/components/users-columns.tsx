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
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { formatQuota, formatTimestamp } from '@/lib/format'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BadgeCell } from '@/components/data-table'
import { GroupBadge } from '@/components/group-badge'
import { LongText } from '@/components/long-text'
import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import {
  USER_STATUS,
  USER_STATUSES,
  USER_ROLES,
  isUserDeleted,
} from '../constants'
import { type User, parseCustomFields, CUSTOM_FIELD_KEYS } from '../types'
import { DataTableRowActions } from './data-table-row-actions'
import { UserProfileHoverCard } from './user-profile-hover-card'

function getQuotaProgressColor(usedPercentage: number): string {
  if (usedPercentage >= 90) return '[&_[data-slot=progress-indicator]]:bg-rose-500'
  if (usedPercentage >= 70) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
}

function formatMonthlyAmountCny(value: number | undefined): string {
  const amount = value ?? 0
  return `¥${Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function formatMonthlyTokens(tokens: number | undefined): string {
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

function formatMonthlyRequests(requests: number | undefined): string {
  const value = requests ?? 0
  if (value <= 0) return '-'
  if (value >= 10_000) {
    return `${Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value / 10_000)}万次`
  }
  return Intl.NumberFormat().format(value)
}

export function useUsersColumns(): ColumnDef<User>[] {
  const { t } = useTranslation()
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'id',
      header: t('ID'),
      cell: ({ row }) => {
        return (
          <TableId value={row.getValue('id') as number} className='w-[60px]' />
        )
      },
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
          <div className='flex min-w-[160px] items-center gap-3'>
            <UserProfileHoverCard user={row.original}>
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
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <LongText className='max-w-[140px] font-medium'>
                  {primaryName}
                </LongText>
                {remark && (
                  <Tooltip>
                    <TooltipTrigger
                      render={<StatusBadge variant='success' copyable={false} />}
                    >
                      <LongText className='max-w-[80px]'>{remark}</LongText>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='text-xs'>{remark}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {displayName && displayName !== username && (
                <LongText className='text-muted-foreground max-w-[180px] text-xs'>
                  {username}
                </LongText>
              )}
            </div>
          </div>
        )
      },
      enableHiding: false,
      size: 260,
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
          return (
            <span className='text-muted-foreground text-sm'>-</span>
          )
        }

        const usedPercentage = Math.min((used / total) * 100, 100)

        return (
          <Tooltip>
            <TooltipTrigger
              render={<div className='w-[150px] cursor-help space-y-1' />}
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
      size: 170,
    },
    {
      accessorKey: 'monthly_total_amount_cny',
      header: t('Monthly Total Cost'),
      cell: ({ row }) => {
        return (
          <span className='text-sm font-medium tabular-nums'>
            {formatMonthlyAmountCny(row.original.monthly_total_amount_cny)}
          </span>
        )
      },
      size: 140,
      meta: { mobileHidden: true },
    },
    {
      accessorKey: 'monthly_total_tokens',
      header: t('Monthly Tokens'),
      cell: ({ row }) => {
        return (
          <span className='text-muted-foreground text-sm tabular-nums'>
            {formatMonthlyTokens(row.original.monthly_total_tokens)}
          </span>
        )
      },
      size: 120,
      meta: { mobileHidden: true },
    },
    {
      accessorKey: 'monthly_total_requests',
      header: t('Monthly Requests'),
      cell: ({ row }) => {
        return (
          <span className='text-muted-foreground text-sm tabular-nums'>
            {formatMonthlyRequests(row.original.monthly_total_requests)}
          </span>
        )
      },
      size: 120,
      meta: { mobileHidden: true },
    },
    {
      accessorKey: 'monthly_common_model',
      header: t('Monthly Common Model'),
      cell: ({ row }) => {
        const modelName = row.original.monthly_common_model
        if (!modelName) {
          return <span className='text-muted-foreground text-sm'>-</span>
        }
        return (
          <Tooltip>
            <TooltipTrigger render={<div className='max-w-[180px] cursor-help' />}>
              <LongText className='text-sm'>{modelName}</LongText>
            </TooltipTrigger>
            <TooltipContent>
              <p className='text-xs'>{modelName}</p>
            </TooltipContent>
          </Tooltip>
        )
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
          <span className='text-muted-foreground text-sm'>
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
          <span className='text-muted-foreground text-sm'>
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
          <span className='text-muted-foreground text-sm'>
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
          <span className='text-muted-foreground text-sm'>
            {ts ? formatTimestamp(ts) : '-'}
          </span>
        )
      },
      size: 180,
      meta: { mobileHidden: true },
    },
    {
      accessorKey: 'role',
      header: t('Role'),
      cell: ({ row }) => {
        const roleValue = row.getValue('role') as number
        const roleConfig = USER_ROLES[roleValue as keyof typeof USER_ROLES]

        if (!roleConfig) {
          return null
        }

        return (
          <div className='flex items-center gap-x-2'>
            {roleConfig.icon && (
              <roleConfig.icon size={16} className='text-muted-foreground' />
            )}
            <span className='text-sm'>{t(roleConfig.labelKey)}</span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => {
        const user = row.original
        const requestCount = user.monthly_total_requests ?? 0

        const statusConfig = isUserDeleted(user)
          ? USER_STATUSES[USER_STATUS.DELETED]
          : USER_STATUSES[user.status as keyof typeof USER_STATUSES]

        if (!statusConfig) {
          return null
        }

        return (
          <Tooltip>
            <TooltipTrigger render={<div className='-ml-1.5 cursor-help' />}>
              <StatusBadge
                label={t(statusConfig.labelKey)}
                variant={statusConfig.variant}
                copyable={false}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className='text-xs'>
                {t('Requests:')} {requestCount.toLocaleString()}
              </p>
            </TooltipContent>
          </Tooltip>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
      enableSorting: false,
      size: 120,
      meta: { mobileBadge: true },
    },
    {
      accessorKey: 'group',
      header: t('Group'),
      cell: ({ row }) => {
        const group = row.getValue('group') as string
        return (
          <BadgeCell>
            <GroupBadge group={group} />
          </BadgeCell>
        )
      },
      filterFn: (row, id, value) => {
        const group = String(row.getValue(id) || t('User Group')).toLowerCase()
        const searchValue = String(value).toLowerCase()
        return group.includes(searchValue)
      },
      size: 140,
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      cell: ({ row }) => <DataTableRowActions row={row} />,
      meta: { pinned: 'right' as const },
    },
  ]
}
