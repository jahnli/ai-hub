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
import { Activity, BarChart3, Crown, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatQuota, formatRequestCount } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import { getDisplayName } from '../lib'
import type { UserProfile } from '../types'

// ============================================================================
// Subscription Summary (inline details inside ProfileHeader)
// ============================================================================

function SubscriptionSummary() {
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

  if (loading || !visible) return null

  const hasActive = activeSubscriptions.length > 0
  const expiredCount = allSubscriptions.length - activeSubscriptions.length
  const hasAny = allSubscriptions.length > 0

  return (
    <div className='border-t'>
      <div className='px-3 py-2.5 sm:px-5 sm:py-3'>
        {/* Header row */}
        <div className='flex min-w-0 items-center gap-2'>
          <Crown className='size-3.5 shrink-0 text-amber-500' />
          <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
            {t('My Subscriptions')}
          </span>
          <span className='flex items-center gap-1.5 text-xs font-medium'>
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
              <span className='text-muted-foreground'>
                {t('No Active')}
              </span>
            )}
            {expiredCount > 0 && (
              <>
                <span className='text-muted-foreground/30'>·</span>
                <span className='text-muted-foreground'>
                  {expiredCount} {t('expired')}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Subscription detail cards */}
        {hasAny && (
          <div className='mt-2.5 space-y-2'>
            {allSubscriptions.map((sub) => {
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
                totalAmount > 0
                  ? Math.round((usedAmount / totalAmount) * 100)
                  : 0
              const isExpired = endTime < now
              const isCancelled = subscription?.status === 'cancelled'
              const isActive = subscription?.status === 'active' && !isExpired

              return (
                <div
                  key={subscription?.id}
                  className='bg-muted/30 rounded-lg border p-2.5 text-xs sm:p-3'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>
                        {planTitle
                          ? `${planTitle} · ${t('Subscription')} #${subscription?.id}`
                          : `${t('Subscription')} #${subscription?.id}`}
                      </span>
                      {isActive ? (
                        <StatusBadge
                          label={t('Active')}
                          variant='success'
                          copyable={false}
                        />
                      ) : isCancelled ? (
                        <StatusBadge
                          label={t('Cancelled')}
                          variant='neutral'
                          copyable={false}
                        />
                      ) : (
                        <StatusBadge
                          label={t('Expired')}
                          variant='neutral'
                          copyable={false}
                        />
                      )}
                    </div>
                    {isActive && (
                      <span className='text-muted-foreground'>
                        {t('{{count}} days remaining', {
                          count: remainDays,
                        })}
                      </span>
                    )}
                  </div>
                  <div className='text-muted-foreground mt-1.5'>
                    {isActive
                      ? t('Until')
                      : isCancelled
                        ? t('Cancelled at')
                        : t('Expired at')}{' '}
                    {new Date(endTime * 1000).toLocaleString()}
                  </div>
                  {isActive && (subscription?.next_reset_time ?? 0) > 0 && (
                    <div className='text-muted-foreground mt-1'>
                      {t('Next reset')}:{' '}
                      {new Date(
                        subscription!.next_reset_time! * 1000
                      ).toLocaleString()}
                    </div>
                  )}
                  <div className='text-muted-foreground mt-1'>
                    {t('Total Quota')}:{' '}
                    {totalAmount > 0 ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<span className='cursor-help' />}
                        >
                          {formatQuota(usedAmount)}/{formatQuota(totalAmount)} ·{' '}
                          {t('Remaining')} {formatQuota(remainAmount)}
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('Raw Quota')}: {usedAmount}/{totalAmount} ·{' '}
                          {t('Remaining')} {remainAmount}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      t('Unlimited')
                    )}
                    {totalAmount > 0 && (
                      <span className='ml-2'>
                        {t('Used')} {usagePercent}%
                      </span>
                    )}
                  </div>
                  {totalAmount > 0 && isActive && (
                    <Progress value={usagePercent} className='mt-2 h-1.5' />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!hasAny && (
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Subscribe to a plan for model access')}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Profile Header Component
// ============================================================================

interface ProfileHeaderProps {
  profile: UserProfile | null
  loading: boolean
}

export function ProfileHeader({ profile, loading }: ProfileHeaderProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
        <CardContent className='p-4 sm:p-5'>
          <div className='flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left'>
            <Skeleton className='h-16 w-16 rounded-2xl' />
            <div className='space-y-3'>
              <div className='flex flex-col items-center gap-2 sm:flex-row sm:justify-start'>
                <Skeleton className='h-8 w-48' />
                <Skeleton className='h-5 w-16' />
              </div>
              <div className='flex flex-col items-center gap-1 sm:flex-row sm:justify-start sm:gap-4'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-4 w-20' />
              </div>
            </div>
          </div>
        </CardContent>
        <div className='border-t'>
          <div className='divide-border/60 grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='px-4 py-3.5 sm:px-5 sm:py-4'>
                <Skeleton className='h-3.5 w-20' />
                <Skeleton className='mt-2 h-7 w-28' />
                <Skeleton className='mt-1.5 h-3.5 w-24' />
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!profile) return null

  const displayName = getDisplayName(profile)
  const avatarName = profile.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)
  const avatarFallbackStyle = getUserAvatarStyle(avatarName)
  const avatarUrl = profile.avatar_url
  const roleLabel = getRoleLabel(profile.role)
  const stats = [
    {
      label: t('Current Balance'),
      value: formatQuota(profile.quota),
      description: t('Remaining quota'),
      icon: WalletCards,
    },
    {
      label: t('Total Usage'),
      value: formatQuota(profile.used_quota),
      description: t('Total consumed quota'),
      icon: BarChart3,
    },
    {
      label: t('API Requests'),
      value: formatRequestCount(profile.request_count ?? 0),
      description: t('Total requests made'),
      icon: Activity,
    },
  ]

  return (
    <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
      <CardContent className='p-3 sm:p-5'>
        <div className='flex items-center gap-3 text-left sm:gap-4'>
          <Avatar className='ring-background h-12 w-12 rounded-xl text-sm ring-2 sm:h-16 sm:w-16 sm:rounded-2xl sm:text-lg sm:ring-4'>
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                alt={avatarName}
                className='rounded-xl sm:rounded-2xl'
              />
            )}
            <AvatarFallback
              className='rounded-xl font-semibold text-white sm:rounded-2xl'
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>

          <div className='min-w-0 flex-1 space-y-1.5 sm:space-y-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <h1 className='truncate text-xl font-semibold tracking-tight sm:text-2xl'>
                {displayName}
              </h1>
              <StatusBadge
                label={roleLabel}
                variant='neutral'
                copyable={false}
              />
              <StatusBadge
                label={`${t('User ID')} ${profile.id}`}
                variant='neutral'
                copyText={String(profile.id)}
              />
            </div>

            <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:gap-x-4 sm:text-sm'>
              <span className='truncate'>@{profile.username}</span>
              {profile.email && (
                <>
                  <span>•</span>
                  <span className='truncate'>{profile.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <div className='border-t'>
        <div className='divide-border/60 grid grid-cols-3 divide-x'>
          {stats.map((item) => (
            <div key={item.label} className='min-w-0 px-3 py-3 sm:px-5 sm:py-4'>
              <div className='flex items-center gap-2'>
                <item.icon className='text-muted-foreground/60 size-3.5 shrink-0' />
                <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                  {item.label}
                </div>
              </div>

              <div className='text-foreground mt-1.5 truncate font-mono text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl'>
                {item.value}
              </div>
              <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SubscriptionSummary />
    </Card>
  )
}
