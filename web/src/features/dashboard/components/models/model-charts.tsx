import { useQuery } from '@tanstack/react-query'
import { VChart } from '@visactor/react-vchart'
import { PieChart as PieChartIcon } from 'lucide-react'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { LongText } from '@/components/long-text'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IconBadge } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDataByUsers } from '@/features/dashboard/api'
import {
  DEFAULT_TIME_GRANULARITY,
  MODEL_ANALYTICS_CHART_OPTIONS,
} from '@/features/dashboard/constants'
import {
  getDefaultDays,
  processChartData,
  processUserChartData,
} from '@/features/dashboard/lib'
import type {
  DashboardFilters,
  ModelAnalyticsChartTab,
  QuotaDataItem,
} from '@/features/dashboard/types'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { useThemeRadiusPx } from '@/lib/theme-radius'
import { computeTimeRange, type TimeGranularity } from '@/lib/time'
import { VCHART_OPTION } from '@/lib/vchart'

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null

type ModelChartSpecKey =
  | 'spec_model_line'
  | 'spec_pie'
  | 'spec_rank_bar'
  | 'spec_line'
type UserChartSpecKey = 'spec_user_rank' | 'spec_user_trend'

const MODEL_CHART_SPEC_KEYS: Partial<
  Record<ModelAnalyticsChartTab, ModelChartSpecKey>
> = {
  trend: 'spec_model_line',
  proportion: 'spec_pie',
  top: 'spec_rank_bar',
  quota: 'spec_line',
}

const USER_CHART_SPEC_KEYS: Partial<
  Record<ModelAnalyticsChartTab, UserChartSpecKey>
> = {
  userRank: 'spec_user_rank',
  userTrend: 'spec_user_trend',
}

const USER_ANALYTICS_TABS = new Set<ModelAnalyticsChartTab>([
  'userRank',
  'userTrend',
])

function normalizeModelAnalyticsChartTab(
  tab: ModelAnalyticsChartTab | undefined,
  canViewUserConsumption: boolean
): ModelAnalyticsChartTab {
  if (!canViewUserConsumption && tab && USER_ANALYTICS_TABS.has(tab)) {
    return 'trend'
  }
  return tab === 'userTrend' ? 'userRank' : (tab ?? 'trend')
}

interface ModelChartsProps {
  data: QuotaDataItem[]
  filters?: DashboardFilters
  loading?: boolean
  timeGranularity?: TimeGranularity
  defaultChartTab?: ModelAnalyticsChartTab
  canViewUserConsumption: boolean
}

interface UserRankProfile {
  username: string
  displayName?: string
  avatarUrl?: string
  totalQuota: number
}

function getUserRankPrimaryName(user: UserRankProfile): string {
  return user.displayName || user.username
}

function UserRankAxisLabel(props: { user: UserRankProfile }) {
  const primaryName = getUserRankPrimaryName(props.user)
  const avatarFallback = getUserAvatarFallback(primaryName)
  const avatarFallbackStyle = getUserAvatarStyle(primaryName)
  const displayLabel = primaryName

  return (
    <div className='flex w-full min-w-0 items-center justify-end gap-1'>
      <Avatar className='size-4.5 shrink-0'>
        {props.user.avatarUrl ? (
          <AvatarImage src={props.user.avatarUrl} alt={primaryName} />
        ) : null}
        <AvatarFallback
          className='text-[1px] font-medium text-white'
          style={avatarFallbackStyle}
        >
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <LongText className='min-w-0 flex-1 text-right text-xs leading-tight font-medium'>
        {displayLabel}
      </LongText>
    </div>
  )
}

export function ModelCharts(props: ModelChartsProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const { customization } = useThemeCustomization()
  const chartRadius = useThemeRadiusPx(
    '--radius-md',
    `${customization.preset}:${customization.radius}`
  )
  const [selectedTab, setSelectedTab] = useState<ModelAnalyticsChartTab>(
    normalizeModelAnalyticsChartTab(
      props.defaultChartTab,
      props.canViewUserConsumption
    )
  )
  const [themeReady, setThemeReady] = useState(false)
  const themeManagerRef = useRef<
    (typeof import('@visactor/vchart'))['ThemeManager'] | null
  >(null)
  const timeGranularity = props.timeGranularity ?? DEFAULT_TIME_GRANULARITY
  const activeTab = normalizeModelAnalyticsChartTab(
    selectedTab,
    props.canViewUserConsumption
  )

  useEffect(() => {
    const updateTheme = async () => {
      setThemeReady(false)

      if (!themeManagerPromise) {
        themeManagerPromise = import('@visactor/vchart').then(
          (m) => m.ThemeManager
        )
      }

      const ThemeManager = await themeManagerPromise
      themeManagerRef.current = ThemeManager
      ThemeManager.setCurrentTheme(resolvedTheme === 'dark' ? 'dark' : 'light')
      setThemeReady(true)
    }

    updateTheme()
  }, [resolvedTheme])

  const chartData = useMemo(
    () =>
      processChartData(
        props.loading ? [] : props.data,
        timeGranularity,
        t,
        chartRadius
      ),
    [props.data, props.loading, timeGranularity, t, chartRadius]
  )

  const userTimeRange = useMemo(
    () =>
      computeTimeRange(
        getDefaultDays(timeGranularity),
        props.filters?.start_timestamp,
        props.filters?.end_timestamp
      ),
    [
      props.filters?.end_timestamp,
      props.filters?.start_timestamp,
      timeGranularity,
    ]
  )

  const userQuotaQuery = useQuery({
    queryKey: ['dashboard', 'model-analytics-user-quota', userTimeRange],
    queryFn: () => getUserQuotaDataByUsers(userTimeRange),
    enabled: props.canViewUserConsumption && USER_ANALYTICS_TABS.has(activeTab),
    select: (response) => (response.success ? response.data : []),
    staleTime: 60_000,
  })

  const userRankProfiles = useMemo(() => {
    const profilesByUsername = new Map<string, UserRankProfile>()
    const userChartDataSource = userQuotaQuery.data ?? []
    userChartDataSource.forEach((item) => {
      const username = item.username || 'unknown'
      const existingProfile = profilesByUsername.get(username)
      const nextTotalQuota =
        (existingProfile?.totalQuota ?? 0) + (Number(item.quota) || 0)

      profilesByUsername.set(username, {
        username,
        displayName: existingProfile?.displayName || item.display_name,
        avatarUrl: existingProfile?.avatarUrl || item.avatar_url,
        totalQuota: nextTotalQuota,
      })
    })

    return [...profilesByUsername.values()]
      .sort(
        (leftProfile, rightProfile) =>
          rightProfile.totalQuota - leftProfile.totalQuota
      )
      .slice(0, 10)
  }, [userQuotaQuery.data])

  const userChartData = useMemo(
    () =>
      processUserChartData(
        userQuotaQuery.isLoading ? [] : (userQuotaQuery.data ?? []),
        timeGranularity,
        t,
        10,
        userRankProfiles
      ),
    [
      userQuotaQuery.data,
      userQuotaQuery.isLoading,
      timeGranularity,
      t,
      userRankProfiles,
    ]
  )

  const modelSpecKey = MODEL_CHART_SPEC_KEYS[activeTab]
  const userSpecKey = props.canViewUserConsumption
    ? USER_CHART_SPEC_KEYS[activeTab]
    : undefined
  let spec = null
  if (modelSpecKey) {
    spec = chartData[modelSpecKey]
  } else if (userSpecKey) {
    spec = userChartData[userSpecKey]
  }
  const isUserAnalyticsTab =
    props.canViewUserConsumption && USER_ANALYTICS_TABS.has(activeTab)
  const isChartLoading =
    props.loading || (isUserAnalyticsTab && userQuotaQuery.isLoading)
  const summaryDisplay = isUserAnalyticsTab
    ? chartData.totalQuotaDisplay
    : chartData.totalCountDisplay
  const specType = typeof spec?.type === 'string' ? spec.type : activeTab
  const chartKey = [
    activeTab,
    specType,
    isChartLoading ? 'loading' : 'ready',
    props.data.length,
    userQuotaQuery.data?.length ?? 0,
    resolvedTheme,
    customization.preset,
  ].join('-')

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex w-full flex-col gap-1.5 border-b px-3 py-2 sm:gap-3 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex items-center gap-2'>
          <IconBadge tone='chart-4' size='sm'>
            <PieChartIcon />
          </IconBadge>
          <div className='text-sm font-semibold'>
            {t('Model Call Analytics')}
          </div>
          <span className='text-muted-foreground text-xs'>
            {t('Total:')} {summaryDisplay}
          </span>
        </div>

        <div className='bg-muted/60 inline-flex h-7 w-full overflow-x-auto rounded-lg border p-0.5 sm:h-8 sm:w-auto'>
          {MODEL_ANALYTICS_CHART_OPTIONS.map((tab) => {
            if (
              !props.canViewUserConsumption &&
              USER_ANALYTICS_TABS.has(tab.value)
            ) {
              return null
            }

            return (
              <button
                key={tab.value}
                type='button'
                onClick={() => setSelectedTab(tab.value)}
                className={`shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <div className='h-[300px] p-1.5 sm:h-96 sm:p-2'>
        {isChartLoading && <Skeleton className='h-full w-full' />}
        {!isChartLoading && isUserAnalyticsTab && activeTab === 'userRank' && (
          <div className='grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-2'>
            <div className='border/0 relative min-h-0 rounded-md'>
              {userRankProfiles.length > 0 ? (
                <div className='pointer-events-none absolute top-[78px] bottom-8 left-8 z-10 w-[128px] sm:top-[100px]'>
                  <div className='flex h-full flex-col'>
                    {userRankProfiles.map((userProfile) => (
                      <div
                        key={userProfile.username}
                        className='flex min-h-0 flex-1 items-center pr-3'
                      >
                        <UserRankAxisLabel user={userProfile} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {themeReady ? (
                <VChart
                  key={`${chartKey}-rank`}
                  spec={{
                    ...userChartData.spec_user_rank,
                    theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                    background: 'transparent',
                  }}
                  option={VCHART_OPTION}
                />
              ) : null}
            </div>
            <div className='border/0 min-h-0 rounded-md'>
              {themeReady ? (
                <VChart
                  key={`${chartKey}-trend`}
                  spec={{
                    ...userChartData.spec_user_trend,
                    theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                    background: 'transparent',
                  }}
                  option={VCHART_OPTION}
                />
              ) : null}
            </div>
          </div>
        )}
        {!isChartLoading && !isUserAnalyticsTab && themeReady && spec && (
          <VChart
            key={chartKey}
            spec={{
              ...spec,
              theme: resolvedTheme === 'dark' ? 'dark' : 'light',
              background: 'transparent',
            }}
            option={VCHART_OPTION}
          />
        )}
      </div>
    </div>
  )
}
