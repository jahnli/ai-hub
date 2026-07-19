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
import { CalendarDays, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { BadgeListCell } from '@/components/data-table/core/badge-list-cell'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import dayjs from '@/lib/dayjs'
import { formatLogQuota } from '@/lib/format'

import type { AuditRow, OffHoursDetailTarget } from '../types'

function formatClock(ts: number): string {
  return dayjs.unix(ts).format('HH:mm:ss')
}

function badgeList(items: string[], variant: 'blue' | 'grey') {
  return (
    <BadgeListCell
      items={items.map((item) => (
        <StatusBadge
          key={item}
          label={item}
          variant={variant}
          size='sm'
          copyable={false}
        />
      ))}
    />
  )
}

export function useOffHoursColumns(
  onViewDetail: (target: OffHoursDetailTarget) => void
): ColumnDef<AuditRow>[] {
  const { t } = useTranslation()

  return useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        id: 'identity',
        header: t('User'),
        meta: { mobileTitle: true },
        size: 240,
        cell: ({ row }) => {
          const audit = row.original
          if (audit.kind === 'user') {
            return (
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 shrink-0 p-0'
                  onClick={row.getToggleExpandedHandler()}
                >
                  {row.getIsExpanded() ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </Button>
                <div className='flex min-w-0 flex-col'>
                  <span className='truncate font-medium'>
                    {audit.user.display_name || audit.user.username}
                  </span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {audit.user.username}
                  </span>
                </div>
                <StatusBadge
                  label={`${audit.user.days} ${t('days')}`}
                  variant='blue'
                  size='sm'
                  copyable={false}
                />
              </div>
            )
          }
          return (
            <div className='flex items-center gap-2 pl-8'>
              <CalendarDays className='text-muted-foreground size-3.5 shrink-0' />
              <span className='tabular-nums'>{audit.day?.date}</span>
            </div>
          )
        },
      },
      {
        id: 'time_range',
        header: t('Time Range'),
        size: 170,
        cell: ({ row }) => {
          const audit = row.original
          if (audit.kind !== 'day' || !audit.day) {
            return <span className='text-muted-foreground text-xs'>-</span>
          }
          return (
            <span className='text-sm tabular-nums'>
              {formatClock(audit.day.start_time)} ~{' '}
              {formatClock(audit.day.end_time)}
            </span>
          )
        },
      },
      {
        id: 'models',
        header: t('Models'),
        size: 220,
        cell: ({ row }) => {
          const audit = row.original
          const models =
            audit.kind === 'day' ? (audit.day?.models ?? []) : audit.user.models
          return badgeList(models, 'blue')
        },
      },
      {
        id: 'ips',
        header: t('IP Addresses'),
        size: 200,
        cell: ({ row }) => {
          const audit = row.original
          const ips =
            audit.kind === 'day' ? (audit.day?.ips ?? []) : audit.user.ips
          return badgeList(ips, 'grey')
        },
      },
      {
        id: 'count',
        header: t('Requests'),
        size: 100,
        cell: ({ row }) => {
          const audit = row.original
          const count =
            audit.kind === 'day' ? (audit.day?.count ?? 0) : audit.user.count
          return (
            <span className='text-sm font-medium tabular-nums'>
              {count.toLocaleString()}
            </span>
          )
        },
      },
      {
        id: 'quota',
        header: t('Cost'),
        size: 115,
        cell: ({ row }) => {
          const audit = row.original
          const quota =
            audit.kind === 'day' ? (audit.day?.quota ?? 0) : audit.user.quota
          return (
            <span className='border-border/80 bg-muted/60 inline-flex h-6 w-fit items-center rounded-md border px-2 text-sm leading-none font-semibold tabular-nums'>
              {formatLogQuota(quota)}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        size: 120,
        cell: ({ row }) => {
          const audit = row.original
          if (audit.kind !== 'day' || !audit.day) return null
          const day = audit.day
          return (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 gap-1.5 px-2 text-xs'
              onClick={() =>
                onViewDetail({
                  username: audit.user.username,
                  displayName: audit.user.display_name || audit.user.username,
                  date: day.date,
                  windowStart: day.window_start,
                  windowEnd: day.window_end,
                })
              }
            >
              <Eye className='size-3.5' />
              {t('View Details')}
            </Button>
          )
        },
      },
    ],
    [t, onViewDetail]
  )
}
