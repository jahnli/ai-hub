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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/stores/auth-store'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import {
  getSelfSubscriptionFull,
  getPublicPlans,
} from '@/features/subscriptions/api'
import type { SubscriptionPlan } from '@/features/subscriptions/types'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { StatCard } from '../ui/stat-card'

const SUMMARY_SPARKLINE_BUCKETS = 12

type SummarySparklineKey = 'balance' | 'usage' | 'requests'

function getBucketIndex(
  timestamp: number,
  start: number,
  end: number,
  bucketCount: number
): number {
  if (end <= start) return 0
  const ratio = (timestamp - start) / (end - start)
  return Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)))
}

function buildSummarySparklines(
  data: QuotaDataItem[],
  currentBalance: number,
  start: number,
  end: number
): Record<SummarySparklineKey, number[]> {
  const usage = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)
  const requests = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)

  for (const item of data) {
    const timestamp = Number(item.created_at) || start
    const index = getBucketIndex(
      timestamp,
      start,
      end,
      SUMMARY_SPARKLINE_BUCKETS
    )
    usage[index] += Number(item.quota) || 0
    requests[index] += Number(item.count) || 0
  }

  let balance = currentBalance
  const balanceTrend = Array.from(
    { length: SUMMARY_SPARKLINE_BUCKETS },
    () => 0
  )

  for (let index = SUMMARY_SPARKLINE_BUCKETS - 1; index >= 0; index--) {
    balanceTrend[index] = Math.max(0, balance)
    balance += usage[index]
  }

  return {
    balance: balanceTrend,
    usage,
    requests,
  }
}

function getSummarySparkline(
  key: string,
  sparklineData: Record<SummarySparklineKey, number[]>
): number[] | undefined {
  if (key === 'usage') return sparklineData.usage
  if (key === 'requests') return sparklineData.requests
  return undefined
}

function calcNextResetTime(
  plan: SubscriptionPlan,
  baseSec: number,
  endSec: number
): number {
  const period = plan.quota_reset_period
  if (!period || period === 'never') return 0

  const base = dayjs(baseSec * 1000)
  let next: dayjs.Dayjs

  switch (period) {
    case 'daily':
      next = base.startOf('day').add(1, 'day')
      break
    case 'weekly': {
      const weekday = base.day() // 0=Sun
      const daysUntil = weekday === 0 ? 1 : 8 - weekday
      next = base.startOf('day').add(daysUntil, 'day')
      break
    }
    case 'monthly':
      next = base.startOf('month').add(1, 'month')
      break
    case 'custom': {
      const secs = plan.quota_reset_custom_seconds ?? 0
      if (secs <= 0) return 0
      next = base.add(secs, 'second')
      break
    }
    default:
      return 0
  }

  const nextSec = Math.floor(next.valueOf() / 1000)
  if (endSec > 0 && nextSec > endSec) return 0
  return nextSec
}

export function SummaryCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()

  const summaryTimeRange = useMemo(() => computeTimeRange(1), [])
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)

  const usageTrendQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'summary-sparklines',
      summaryTimeRange.start_timestamp,
      summaryTimeRange.end_timestamp,
    ],
    queryFn: async () =>
      getUserQuotaDates({
        start_timestamp: summaryTimeRange.start_timestamp,
        end_timestamp: summaryTimeRange.end_timestamp,
        default_time: 'hour',
      }),
    staleTime: 60 * 1000,
  })

  const subscriptionQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscription-self'],
    queryFn: getSelfSubscriptionFull,
    staleTime: 60 * 1000,
  })

  const plansQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'public-plans'],
    queryFn: getPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  const planMap = useMemo(() => {
    const map = new Map<number, SubscriptionPlan>()
    for (const record of plansQuery.data?.data ?? []) {
      map.set(record.plan.id, record.plan)
    }
    return map
  }, [plansQuery.data?.data])

  const activeSub = useMemo(() => {
    const subs = subscriptionQuery.data?.data?.subscriptions ?? []
    if (subs.length === 0) return null
    return subs[0].subscription
  }, [subscriptionQuery.data?.data?.subscriptions])

  const nextResetTime = useMemo(() => {
    if (!activeSub) return 0
    if (activeSub.next_reset_time && activeSub.next_reset_time > 0) {
      return activeSub.next_reset_time
    }
    const plan = planMap.get(activeSub.plan_id)
    if (!plan) return 0
    const baseSec = activeSub.start_time || Math.floor(Date.now() / 1000)
    return calcNextResetTime(plan, baseSec, activeSub.end_time)
  }, [activeSub, planMap])

  const summaryValues = useMemo(() => {
    return {
      usedDisplay: formatQuota(usedQuota),
      requestCountDisplay: formatNumber(requestCount),
    }
  }, [requestCount, usedQuota])

  const currencyEnabledFromStore = isCurrencyDisplayEnabled()
  const statusCurrencyFlag =
    typeof status?.display_in_currency === 'boolean'
      ? Boolean(status.display_in_currency)
      : undefined
  const currencyEnabled =
    statusCurrencyFlag !== undefined
      ? statusCurrencyFlag
      : currencyEnabledFromStore
  const currencyLabel = currencyEnabled ? getCurrencyLabel() : 'Tokens'

  const sparklineData = useMemo(
    () =>
      buildSummarySparklines(
        usageTrendQuery.data?.data ?? [],
        remainQuota,
        summaryTimeRange.start_timestamp,
        summaryTimeRange.end_timestamp
      ),
    [
      remainQuota,
      summaryTimeRange.end_timestamp,
      summaryTimeRange.start_timestamp,
      usageTrendQuery.data?.data,
    ]
  )

  const recentUsage = useMemo(
    () =>
      (usageTrendQuery.data?.data ?? []).reduce(
        (total, item) => total + (Number(item.quota) || 0),
        0
      ),
    [usageTrendQuery.data?.data]
  )

  const todayUsageDisplay = formatQuota(recentUsage)

  const items = useSummaryCardsConfig({
    ...summaryValues,
    todayUsageDisplay,
    currencyEnabled,
    currencyLabel,
  }).map((config, index) => {
    const tones = ['rose', 'teal', 'gray'] as const

    return {
      key: config.key,
      title: config.title,
      value: config.value,
      desc: config.description,
      icon: config.icon,
      tone: tones[index] ?? 'gray',
      sparkline:
        config.key === 'todayUsage'
          ? sparklineData.usage
          : getSummarySparkline(config.key, sparklineData),
      sparklineVariant: 'line' as const,
    }
  })

  const subAmountTotal = Number(activeSub?.amount_total ?? 0)
  const subAmountUsed = Number(activeSub?.amount_used ?? 0)
  const isUnlimited = subAmountTotal === 0 && activeSub !== null
  const usagePercent =
    isUnlimited || subAmountTotal === 0
      ? 0
      : Math.min(100, (subAmountUsed / subAmountTotal) * 100)

  return (
    <div className='bg-card overflow-hidden rounded-2xl border shadow-xs'>
      <div className='grid xl:grid-cols-[minmax(0,1fr)_19rem]'>
        <div className='flex flex-col gap-3 p-4 sm:p-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex flex-col gap-1'>
              <h3 className='text-base font-semibold'>
                {t('Usage at a glance')}
              </h3>
              <p className='text-muted-foreground text-sm'>
                {t('Monitor balance, usage, and request volume')}
              </p>
            </div>
          </div>
          <StaggerContainer className='grid gap-3 md:grid-cols-3'>
            {items.map((it) => (
              <StaggerItem
                key={it.key}
                className='bg-background/60 rounded-xl border p-3'
              >
                <StatCard
                  title={it.title}
                  value={it.value}
                  description={it.desc}
                  icon={it.icon}
                  tone={it.tone}
                  sparkline={it.sparkline}
                  sparklineVariant={it.sparklineVariant}
                  loading={loading}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <div className='bg-muted/40 flex flex-col justify-center gap-4 border-t p-4 sm:p-5 xl:border-t-0 xl:border-l'>
          {activeSub ? (
            <div className='flex flex-col gap-3'>
              <span className='text-muted-foreground text-xs font-medium'>
                {t('Current Subscription')}
              </span>

              <div className='flex flex-col gap-1.5'>
                <div className='flex items-baseline gap-1'>
                  <span className='font-mono text-2xl font-semibold tracking-tight'>
                    {formatQuota(subAmountUsed)}
                  </span>
                  <span className='text-muted-foreground text-2xl font-semibold tracking-tight'>
                    / {isUnlimited ? t('Unlimited') : formatQuota(subAmountTotal)}
                  </span>
                </div>
                {!isUnlimited && (
                  <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        usagePercent >= 90
                          ? 'bg-destructive'
                          : usagePercent >= 70
                            ? 'bg-warning'
                            : 'bg-primary'
                      )}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                )}
              </div>

              {nextResetTime > 0 && (
                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <CalendarClock className='size-3.5 shrink-0' aria-hidden='true' />
                  <span>
                    {t('Next reset')}:{' '}
                    {dayjs(nextResetTime * 1000).format('YYYY/M/D HH:mm:ss')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className='flex flex-1 flex-col items-center justify-center gap-2'>
              <Package
                className='text-muted-foreground/50 size-8'
                aria-hidden='true'
              />
              <span className='text-muted-foreground text-sm'>
                {t('No subscription records')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
