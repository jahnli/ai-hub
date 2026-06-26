import { useMemo, useState } from 'react'
import { VChart } from '@visactor/react-vchart'
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'
import type { DailyStat, UsageAnalysis } from '../types'

interface UsageAnalysisProps {
  data: UsageAnalysis
  startTimestamp: number
  endTimestamp: number
}

export function UsageAnalysisSection(props: UsageAnalysisProps) {
  const { t } = useTranslation()
  const { resolvedTheme, themeReady } = useChartTheme()
  const hasModelData = props.data.model_stats && props.data.model_stats.length > 0
  const hasDailyData = props.data.daily_stats && props.data.daily_stats.length > 0

  if (!hasModelData && !hasDailyData) {
    return null
  }

  return (
    <Card className='mt-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Activity className='text-primary size-5' />
          {t('Usage Analysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-0 p-0'>
        {hasModelData && (
          <ModelCharts
            data={props.data.model_stats}
            themeReady={themeReady}
            resolvedTheme={resolvedTheme}
          />
        )}
        {hasModelData && (
          <ModelUsageTrend
            data={props.data.model_daily_stats ?? []}
            themeReady={themeReady}
            resolvedTheme={resolvedTheme}
          />
        )}
        {hasDailyData && (
          <DailyTrendChart
            data={props.data.daily_stats}
            themeReady={themeReady}
            resolvedTheme={resolvedTheme}
          />
        )}
        {hasDailyData && (
          <AvgPriceTrendChart
            data={props.data.daily_stats}
            startTimestamp={props.startTimestamp}
            endTimestamp={props.endTimestamp}
            themeReady={themeReady}
            resolvedTheme={resolvedTheme}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ── Model Charts (bar + pie with tab switch) ──

interface ChartProps {
  data: any[]
  themeReady: boolean
  resolvedTheme: string | undefined
}

function ModelCharts(props: ChartProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<'bar' | 'pie'>('bar')

  const barSpec = useMemo(
    () => ({
      type: 'bar' as const,
      data: [
        {
          values: props.data.map(
            (item: { model_name: string; total_requests: number }) => ({
              name: item.model_name,
              requests: item.total_requests,
            })
          ),
        },
      ],
      xField: 'name',
      yField: 'requests',
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => {
          if (value >= 1_0000) return (value / 1_0000).toFixed(1) + ' 万'
          return value.toLocaleString()
        },
      },
      bar: { style: { cornerRadius: [4, 4, 4, 4] } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            formatMethod: (v: string) =>
              v.length > 14 ? v.slice(0, 14) + '…' : v,
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (v: number) => {
              if (v >= 1_0000) return (v / 1_0000).toFixed(0) + ' 万'
              return v.toLocaleString()
            },
          },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: t('Requests'),
              value: (d: { requests?: number }) =>
                (d.requests ?? 0).toLocaleString(),
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }),
    [props.data, props.resolvedTheme, t]
  )

  const pieSpec = useMemo(
    () => ({
      type: 'pie' as const,
      data: [
        {
          values: props.data
            .filter((i: { total_quota: number }) => i.total_quota > 0)
            .map((i: { model_name: string; total_quota: number }) => ({
              name: i.model_name,
              value: i.total_quota / 500000,
            })),
        },
      ],
      valueField: 'value',
      categoryField: 'name',
      outerRadius: 0.8,
      innerRadius: 0.5,
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (_: unknown, d: { name?: string }) => d.name ?? '',
      },
      tooltip: {
        mark: {
          content: [
            {
              key: (d: { name?: string }) => d.name ?? '',
              value: (d: { value?: number }) => {
                const v = d.value ?? 0
                return v === 0 ? '¥0' : '¥' + v.toFixed(2)
              },
            },
          ],
        },
      },
      legends: { visible: false },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }),
    [props.data, props.resolvedTheme]
  )

  const tabs = [
    {
      value: 'bar' as const,
      icon: BarChart3,
      label: t('Model Ranking'),
    },
    {
      value: 'pie' as const,
      icon: PieChart,
      label: t('Model Cost Share'),
    },
  ]

  return (
    <div className='border-t first:border-t-0'>
      <div className='flex w-full items-center justify-between px-5 py-3'>
        <div className='flex items-center gap-2'>
          {view === 'bar' ? (
            <BarChart3 className='text-muted-foreground/60 size-4' />
          ) : (
            <PieChart className='text-muted-foreground/60 size-4' />
          )}
          <span className='text-sm font-semibold'>
            {view === 'bar' ? t('Model Ranking') : t('Model Cost Share')}
          </span>
        </div>
        <div className='bg-muted/60 inline-flex h-7 rounded-lg border p-0.5'>
          {tabs.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type='button'
              onClick={() => setView(value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                view === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className='size-3.5' />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className='h-[300px] p-2'>
        {props.themeReady && (
          <VChart
            key={`model-${view}-${props.resolvedTheme}`}
            spec={view === 'bar' ? barSpec : pieSpec}
            option={VCHART_OPTION}
          />
        )}
      </div>
    </div>
  )
}

function formatDateLabel(v: string): string {
  const parts = v.split('-')
  return parts.length === 3 ? parts[1] + '-' + parts[2] : v
}

// ── Daily Trend Chart ──

function DailyTrendChart(props: ChartProps) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<'tokens' | 'requests' | 'quota'>(
    'tokens'
  )

  const spec = useMemo(() => {
    const getValue = (item: {
      total_tokens: number
      total_requests: number
      total_quota: number
    }) => {
      if (metric === 'tokens') return item.total_tokens
      if (metric === 'requests') return item.total_requests
      return item.total_quota / 500000
    }

    const formatAxis = (v: number) => {
      if (metric === 'quota') return '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v.toFixed(0))
      if (metric === 'requests') {
        if (v >= 1_0000) return (v / 1_0000).toFixed(0) + ' 万'
        return v.toLocaleString()
      }
      return (v / 1_0000_0000).toFixed(1) + ' 亿'
    }

    const tooltipKey =
      metric === 'tokens'
        ? 'Tokens'
        : metric === 'requests'
          ? t('Requests')
          : t('Cost')

    const formatTooltip = (v: number) =>
      metric === 'quota'
        ? (v === 0 ? '¥0' : '¥' + v.toFixed(2))
        : v.toLocaleString()

    return {
      type: 'area' as const,
      data: [
        {
          values: props.data.map(
            (item: {
              date: string
              total_tokens: number
              total_requests: number
              total_quota: number
            }) => ({
              date: item.date,
              value: getValue(item),
            })
          ),
        },
      ],
      xField: 'date',
      yField: 'value',
      point: { visible: props.data.length <= 60, size: 4 },
      line: { style: { curveType: 'monotone' } },
      area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            autoHide: true,
            autoHideMethod: 'greedy',
            formatMethod: (v: string) => formatDateLabel(v),
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: { formatMethod: formatAxis },
        },
      ],
      dataZoom: [
        {
          orient: 'bottom',
          filterMode: 'axis',
          startText: { formatMethod: (v: string) => v },
          endText: { formatMethod: (v: string) => v },
          backgroundChart: {
            area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
            line: { style: { lineWidth: 1 } },
          },
        },
      ],
      tooltip: {
        mark: {
          title: { value: (d: { date?: string }) => d.date ?? '' },
          content: [
            {
              key: tooltipKey,
              value: (d: { value?: number }) => formatTooltip(d.value ?? 0),
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }
  }, [props.data, props.resolvedTheme, metric, t])

  const tabs = [
    { value: 'tokens' as const, label: 'Tokens' },
    { value: 'requests' as const, label: t('Requests') },
    { value: 'quota' as const, label: t('Cost') },
  ]

  return (
    <div className='border-t'>
      <div className='flex w-full items-center justify-between px-5 py-3'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='text-muted-foreground/60 size-4' />
          <span className='text-sm font-semibold'>
            {t('Daily Usage Trend')}
          </span>
        </div>
        <div className='bg-muted/60 inline-flex h-7 rounded-lg border p-0.5'>
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type='button'
              onClick={() => setMetric(value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                metric === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className='h-[340px] p-2'>
        {props.themeReady && (
          <VChart
            key={`daily-${metric}-${props.resolvedTheme}`}
            spec={spec}
            option={VCHART_OPTION}
          />
        )}
      </div>
    </div>
  )
}

// ── Model Usage Trend (per-model daily line chart) ──

function ModelUsageTrend(props: ChartProps) {
  const { t } = useTranslation()
  const spec = useMemo(() => {
    if (props.data.length === 0) return null

    const formatAxis = (v: number) => {
      return (v / 1_0000_0000).toFixed(1) + ' 亿'
    }

    const dayCount = new Set(props.data.map((d: { date: string }) => d.date)).size

    return {
      type: 'line' as const,
      data: [
        {
          values: props.data.map(
            (item: {
              date: string
              model_name: string
              total_tokens: number
            }) => ({
              date: item.date,
              model: item.model_name,
              tokens: item.total_tokens,
            })
          ),
        },
      ],
      xField: 'date',
      yField: 'tokens',
      seriesField: 'model',
      point: { visible: dayCount <= 60, size: 3 },
      line: { style: { curveType: 'monotone' } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            autoHide: true,
            autoHideMethod: 'greedy',
            formatMethod: (v: string) => formatDateLabel(v),
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: { formatMethod: formatAxis },
        },
      ],
      dataZoom: [
        {
          orient: 'bottom',
          filterMode: 'axis',
          startText: { formatMethod: (v: string) => v },
          endText: { formatMethod: (v: string) => v },
          backgroundChart: {
            line: { style: { lineWidth: 1 } },
          },
        },
      ],
      legends: {
        visible: true,
        orient: 'right',
        position: 'start',
        item: {
          label: {
            formatMethod: (v: string) =>
              v.length > 18 ? v.slice(0, 18) + '…' : v,
          },
        },
      },
      tooltip: {
        mark: {
          title: { value: (d: { date?: string }) => d.date ?? '' },
          content: [
            {
              key: (d: { model?: string }) => d.model ?? '',
              value: (d: { tokens?: number }) =>
                (d.tokens ?? 0).toLocaleString(),
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }
  }, [props.data, props.resolvedTheme])

  if (props.data.length === 0) return null

  return (
    <div className='border-t'>
      <div className='flex w-full items-center justify-between px-5 py-3'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='text-muted-foreground/60 size-4' />
          <span className='text-sm font-semibold'>
            {t('Model Usage Trend')}
          </span>
        </div>
      </div>
      <div className='h-[390px] p-2'>
        {props.themeReady && spec && (
          <VChart
            key={`model-daily-${props.resolvedTheme}`}
            spec={spec}
            option={VCHART_OPTION}
          />
        )}
      </div>
    </div>
  )
}

// ── Avg Price Trend Chart ──

function getISOWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

interface AvgPriceTrendProps {
  data: DailyStat[]
  startTimestamp: number
  endTimestamp: number
  themeReady: boolean
  resolvedTheme: string | undefined
}

function AvgPriceTrendChart(props: AvgPriceTrendProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    const rangeDays =
      (props.endTimestamp - props.startTimestamp) / 86400
    const useWeekly = rangeDays > 7

    if (!useWeekly) {
      return props.data
        .map((item) => {
          const tokens = item.total_tokens
          if (tokens <= 0) return null
          const costYuan = item.total_quota / 500000
          const pricePerMT = costYuan / (tokens / 1_000_000)
          return { label: item.date, value: pricePerMT }
        })
        .filter((v): v is { label: string; value: number } => v !== null)
    }

    const weekBuckets = new Map<
      string,
      { totalQuota: number; totalTokens: number }
    >()
    for (const item of props.data) {
      const weekLabel = getISOWeekLabel(item.date)
      const bucket = weekBuckets.get(weekLabel) ?? {
        totalQuota: 0,
        totalTokens: 0,
      }
      bucket.totalQuota += item.total_quota
      bucket.totalTokens += item.total_tokens
      weekBuckets.set(weekLabel, bucket)
    }

    const result: { label: string; value: number }[] = []
    for (const [weekLabel, bucket] of weekBuckets) {
      if (bucket.totalTokens <= 0) continue
      const costYuan = bucket.totalQuota / 500000
      const pricePerMT = costYuan / (bucket.totalTokens / 1_000_000)
      result.push({ label: weekLabel, value: pricePerMT })
    }
    return result
  }, [props.data, props.startTimestamp, props.endTimestamp])

  const spec = useMemo(() => {
    if (chartData.length === 0) return null

    return {
      type: 'line' as const,
      data: [{ values: chartData }],
      xField: 'label',
      yField: 'value',
      point: { visible: chartData.length <= 60, size: 4 },
      line: { style: { curveType: 'monotone' } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            autoHide: true,
            autoHideMethod: 'greedy',
            formatMethod: (v: string) => {
              if (v.includes('-W')) return v
              return formatDateLabel(v)
            },
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (v: number) => v === 0 ? '¥0' : '¥' + v.toFixed(2),
          },
        },
      ],
      tooltip: {
        mark: {
          title: { value: (d: { label?: string }) => d.label ?? '' },
          content: [
            {
              key: t('Avg Price'),
              value: (d: { value?: number }) =>
                '¥' + (d.value ?? 0).toFixed(4) + ' / M Tokens',
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }
  }, [chartData, props.resolvedTheme, t])

  if (!spec) return null

  return (
    <div className='border-t'>
      <div className='flex w-full items-center justify-between px-5 py-3'>
        <div className='flex items-center gap-2'>
          <DollarSign className='text-muted-foreground/60 size-4' />
          <span className='text-sm font-semibold'>
            {t('Avg Price Trend')}
          </span>
        </div>
      </div>
      <div className='h-[340px] p-2'>
        {props.themeReady && (
          <VChart
            key={`avg-price-${props.resolvedTheme}`}
            spec={spec}
            option={VCHART_OPTION}
          />
        )}
      </div>
    </div>
  )
}
