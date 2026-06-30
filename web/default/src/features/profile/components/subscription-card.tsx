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
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Crown, Clock, CalendarDays, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge,
  dotColorMap,
  textColorMap,
} from '@/components/status-badge'
import { TitledCard } from '@/components/ui/titled-card'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

export function SubscriptionCard() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [allSubscriptions, setAllSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, selfRes] = await Promise.all([
        getPublicPlans(),
        getSelfSubscriptionFull(),
      ])
      const fetchedPlans = plansRes.success ? plansRes.data || [] : []
      const active = selfRes.success ? selfRes.data?.subscriptions || [] : []
      const all = selfRes.success ? selfRes.data?.all_subscriptions || [] : []

      setPlans(fetchedPlans)
      setActiveSubscriptions(active)
      setAllSubscriptions(all)
      setVisible(fetchedPlans.length > 0 || all.length > 0)
    } catch {
      setVisible(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of plans) {
      if (p?.plan?.id) {
        map.set(p.plan.id, p.plan.title || '')
      }
    }
    return map
  }, [plans])

  if (loading) {
    return (
      <TitledCard
        icon={<Crown className='size-4 text-amber-500' />}
        title={t('My Subscriptions')}
      >
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className='rounded-xl border p-4'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='mt-3 h-3 w-24' />
              <Skeleton className='mt-2 h-2 w-full' />
            </div>
          ))}
        </div>
      </TitledCard>
    )
  }

  if (!visible) return null

  const hasActive = activeSubscriptions.length > 0
  const expiredCount = allSubscriptions.length - activeSubscriptions.length
  const hasAny = allSubscriptions.length > 0

  const headerDescription = hasAny ? (
    <span className='flex items-center gap-2'>
      <span className='flex items-center gap-1.5'>
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            hasActive ? dotColorMap.success : dotColorMap.neutral
          )}
          aria-hidden='true'
        />
        {hasActive ? (
          <span className={cn(textColorMap.success)}>
            {activeSubscriptions.length} {t('active')}
          </span>
        ) : (
          <span className='text-muted-foreground'>{t('No Active')}</span>
        )}
      </span>
      {expiredCount > 0 && (
        <span className='text-muted-foreground'>
          · {expiredCount} {t('expired')}
        </span>
      )}
    </span>
  ) : undefined

  return (
    <TitledCard
      icon={<Crown className='size-4 text-amber-500' />}
      title={t('My Subscriptions')}
      description={headerDescription}
    >
      {hasAny ? (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {allSubscriptions.map((sub) => (
            <SubscriptionItem
              key={sub.subscription?.id}
              sub={sub}
              planTitleMap={planTitleMap}
            />
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          {t('Subscribe to a plan for model access')}
        </p>
      )}
    </TitledCard>
  )
}

function SubscriptionItem({
  sub,
  planTitleMap,
}: {
  sub: UserSubscriptionRecord
  planTitleMap: Map<number, string>
}) {
  const { t } = useTranslation()
  const subscription = sub.subscription
  const totalAmount = Number(subscription?.amount_total || 0)
  const usedAmount = Number(subscription?.amount_used || 0)
  const remainAmount =
    totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
  const planTitle = planTitleMap.get(subscription?.plan_id) || ''
  const now = Date.now() / 1000
  const endTime = subscription?.end_time || 0
  const remainDays = endTime
    ? Math.max(0, Math.ceil((endTime - now) / 86400))
    : 0
  const usagePercent =
    totalAmount > 0 ? Math.round((usedAmount / totalAmount) * 100) : 0
  const isExpired = endTime < now
  const isCancelled = subscription?.status === 'cancelled'
  const isActive = subscription?.status === 'active' && !isExpired

  return (
    <div className='flex flex-col justify-between rounded-xl border p-3 sm:p-4'>
      <div>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate text-sm font-medium'>
            {planTitle || `${t('Subscription')} #${subscription?.id}`}
          </span>
          {isActive ? (
            <StatusBadge label={t('Active')} variant='success' copyable={false} />
          ) : isCancelled ? (
            <StatusBadge label={t('Cancelled')} variant='neutral' copyable={false} />
          ) : (
            <StatusBadge label={t('Expired')} variant='neutral' copyable={false} />
          )}
        </div>

        <div className='text-muted-foreground mt-2 space-y-1 text-xs'>
          {isActive && (
            <div className='flex items-center gap-1.5'>
              <Clock className='size-3 shrink-0' />
              <span>
                {t('{{count}} days remaining', { count: remainDays })}
              </span>
            </div>
          )}
          <div className='flex items-center gap-1.5'>
            <CalendarDays className='size-3 shrink-0' />
            <span>
              {isActive
                ? t('Until')
                : isCancelled
                  ? t('Cancelled at')
                  : t('Expired at')}{' '}
              {new Date(endTime * 1000).toLocaleDateString()}
            </span>
          </div>
          {isActive && (subscription?.next_reset_time ?? 0) > 0 && (
            <div className='flex items-center gap-1.5'>
              <RefreshCw className='size-3 shrink-0' />
              <span>
                {t('Next reset')}:{' '}
                {new Date(subscription!.next_reset_time! * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {totalAmount > 0 && (
        <div className='mt-3 border-t pt-3'>
          <div className='flex items-center justify-between text-xs'>
            <Tooltip>
              <TooltipTrigger render={<span className='text-muted-foreground cursor-help' />}>
                {formatQuota(usedAmount)} / {formatQuota(totalAmount)}
              </TooltipTrigger>
              <TooltipContent>
                {t('Raw Quota')}: {usedAmount}/{totalAmount} · {t('Remaining')}{' '}
                {remainAmount}
              </TooltipContent>
            </Tooltip>
            <span className='text-muted-foreground font-medium tabular-nums'>
              {usagePercent}%
            </span>
          </div>
          {isActive && (
            <Progress
              value={usagePercent}
              className={cn(
                'mt-2 h-1.5',
                usagePercent < 50
                  ? '[&_[data-slot=progress-indicator]]:bg-emerald-500'
                  : usagePercent < 80
                    ? '[&_[data-slot=progress-indicator]]:bg-amber-500'
                    : '[&_[data-slot=progress-indicator]]:bg-red-500'
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}
