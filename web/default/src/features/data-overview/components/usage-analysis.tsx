import { useMemo, useState } from 'react'
import { VChart } from '@visactor/react-vchart'
import {
  BarChart3,
  Coins,
  DollarSign,
  Hash,
  Layers,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'
import type { DailyStat, ModelDailyStat, ModelStat, UsageAnalysis } from '../types'

interface UsageAnalysisProps {
  data: UsageAnalysis
  startTimestamp: number
  endTimestamp: number
}

export function UsageAnalysisSection(props: UsageAnalysisProps) {
  const { resolvedTheme, themeReady } = useChartTheme()
  const hasModelData =
    props.data.model_stats && props.data.model_stats.length > 0
  const hasDailyData =
    props.data.daily_stats && props.data.daily_stats.length > 0

  if (!hasModelData && !hasDailyData) {
    return null
  }

  const chartProps = { themeReady, resolvedTheme }

  return (
    <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {hasDailyData && (
        <QuotaTrendChart data={props.data.daily_stats} {...chartProps} />
      )}
      {hasDailyData && (
        <RequestTrendChart data={props.data.daily_stats} {...chartProps} />
      )}
      {hasDailyData && (
        <TokenTrendChart data={props.data.daily_stats} {...chartProps} />
      )}
      {hasModelData && (
        <ModelUsageTrendChart
          data={props.data.model_daily_stats ?? []}
          {...chartProps}
        />
      )}
      {hasModelData && (
        <ModelCallRankChart data={props.data.model_stats} {...chartProps} />
      )}
      {hasModelData && (
        <ModelCostRankChart data={props.data.model_stats} {...chartProps} />
      )}
      {hasDailyData && (
        <AvgPriceTrendChart
          data={props.data.daily_stats}
          startTimestamp={props.startTimestamp}
          endTimestamp={props.endTimestamp}
          {...chartProps}
        />
      )}
      {hasModelData && (
        <ModelTokenDistChart data={props.data.model_stats} {...chartProps} />
      )}
    </div>
  )
}

// ── Shared ──

interface ChartBaseProps {
  themeReady: boolean
  resolvedTheme: string | undefined
}

function ChartCard(props: {
  icon: React.ElementType
  title: string
  actions?: React.ReactNode
  themeReady: boolean
  resolvedTheme: string | undefined
  chartKey: string
  spec: object | null
  height?: string
}) {
  const Icon = props.icon
  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex w-full items-center justify-between px-4 py-2.5'>
        <div className='flex items-center gap-2'>
          <Icon className='text-muted-foreground/60 size-4' />
          <span className='text-sm font-semibold'>{props.title}</span>
        </div>
        {props.actions}
      </div>
      <div className={`${props.height ?? 'h-[300px]'} p-2`}>
        {props.themeReady && props.spec && (
          <VChart
            key={props.chartKey}
            spec={{
              ...(props.spec as any),
              theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
              background: 'transparent',
            }}
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

function formatLargeNumber(v: number): string {
  if (v >= 1_0000) return (v / 1_0000).toFixed(1) + ' 万'
  return v.toLocaleString()
}

const DATA_ZOOM_THRESHOLD = 14

function makeDataZoom(chartType: 'area' | 'line') {
  const backgroundChart =
    chartType === 'area'
      ? {
          area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
          line: { style: { lineWidth: 1 } },
        }
      : { line: { style: { lineWidth: 1 } } }

  return [
    {
      orient: 'bottom' as const,
      filterMode: 'axis' as const,
      startText: { formatMethod: (v: string) => v },
      endText: { formatMethod: (v: string) => v },
      backgroundChart,
    },
  ]
}

const APPEAR_ANIMATION = {
  animationAppear: {
    duration: 800,
    easing: 'cubicOut',
  },
}

function makeAreaSpec(
  data: { date: string; value: number }[],
  yAxisFormat: (v: number) => string,
  tooltipKey: string,
  tooltipFormat: (v: number) => string
) {
  return {
    type: 'area' as const,
    data: [{ values: data }],
    xField: 'date',
    yField: 'value',
    point: { visible: data.length <= 60, size: 4 },
    line: { style: { curveType: 'monotone' } },
    area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
    ...APPEAR_ANIMATION,
    ...(data.length > DATA_ZOOM_THRESHOLD
      ? { dataZoom: makeDataZoom('area') }
      : {}),
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
        label: { formatMethod: yAxisFormat },
      },
    ],
    tooltip: {
      mark: {
        title: { value: (d: { date?: string }) => d.date ?? '' },
        content: [
          {
            key: tooltipKey,
            value: (d: { value?: number }) => tooltipFormat(d.value ?? 0),
          },
        ],
      },
    },
  }
}

// ── 1. 额度消耗趋势 ──

function QuotaTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_quota / 500000,
    }))
    return makeAreaSpec(
      values,
      (v) => (v === 0 ? '¥0' : v >= 1000 ? '¥' + (v / 1000).toFixed(0) + 'K' : '¥' + v.toFixed(0)),
      t('Cost'),
      (v) => (v === 0 ? '¥0' : '¥' + v.toFixed(2))
    )
  }, [props.data, t])

  return (
    <ChartCard
      icon={Coins}
      title={t('Quota Consumption Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`quota-trend-${props.resolvedTheme}`}
      spec={spec}
    />
  )
}

// ── 2. 请求次数趋势 ──

function RequestTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_requests,
    }))
    return makeAreaSpec(
      values,
      (v) => formatLargeNumber(v),
      t('Requests'),
      (v) => v.toLocaleString()
    )
  }, [props.data, t])

  return (
    <ChartCard
      icon={Hash}
      title={t('Request Count Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`request-trend-${props.resolvedTheme}`}
      spec={spec}
    />
  )
}

// ── 3. 每日 Token 用量趋势 ──

function TokenTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_tokens,
    }))
    return makeAreaSpec(
      values,
      (v) => {
        if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(1) + ' 亿'
        if (v >= 1_0000) return (v / 1_0000).toFixed(0) + ' 万'
        return v.toLocaleString()
      },
      'Tokens',
      (v) => v.toLocaleString()
    )
  }, [props.data])

  return (
    <ChartCard
      icon={Layers}
      title={t('Daily Token Usage Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`token-trend-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 4. 模型使用趋势 ──

function ModelUsageTrendChart(
  props: ChartBaseProps & { data: ModelDailyStat[] }
) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    if (props.data.length === 0) return null

    const dayCount = new Set(props.data.map((d) => d.date)).size

    return {
      type: 'line' as const,
      data: [
        {
          values: props.data.map((item) => ({
            date: item.date,
            model: item.model_name,
            tokens: item.total_tokens,
          })),
        },
      ],
      xField: 'date',
      yField: 'tokens',
      seriesField: 'model',
      point: { visible: dayCount <= 60, size: 3 },
      line: { style: { curveType: 'monotone' } },
      ...APPEAR_ANIMATION,
      ...(dayCount > DATA_ZOOM_THRESHOLD
        ? { dataZoom: makeDataZoom('line') }
        : {}),
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
          label: {
            formatMethod: (v: number) => {
              if (v >= 1_0000_0000)
                return (v / 1_0000_0000).toFixed(1) + ' 亿'
              if (v >= 1_0000) return (v / 1_0000).toFixed(0) + ' 万'
              return v.toLocaleString()
            },
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
    }
  }, [props.data])

  if (props.data.length === 0) return null

  return (
    <ChartCard
      icon={TrendingUp}
      title={t('Model Usage Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`model-usage-trend-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 5. 模型调用排行 ──

function ModelCallRankChart(props: ChartBaseProps & { data: ModelStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const sorted = [...props.data]
      .sort((a, b) => a.total_requests - b.total_requests)
      .slice(-15)

    return {
      type: 'bar' as const,
      data: [
        {
          values: sorted.map((item) => ({
            name: item.model_name,
            value: item.total_requests,
          })),
        },
      ],
      direction: 'horizontal' as const,
      xField: 'value',
      yField: 'name',
      ...APPEAR_ANIMATION,
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => formatLargeNumber(value),
      },
      bar: { style: { cornerRadius: [0, 4, 4, 0] } },
      axes: [
        {
          orient: 'left',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            formatMethod: (v: string) =>
              v.length > 20 ? v.slice(0, 20) + '…' : v,
          },
        },
        {
          orient: 'bottom',
          type: 'linear',
          label: {
            formatMethod: (v: number) => formatLargeNumber(v),
          },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: t('Requests'),
              value: (d: { value?: number }) =>
                (d.value ?? 0).toLocaleString(),
            },
          ],
        },
      },
    }
  }, [props.data, t])

  return (
    <ChartCard
      icon={BarChart3}
      title={t('Model Call Ranking')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`model-call-rank-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 6. 模型费用排行 ──

function ModelCostRankChart(props: ChartBaseProps & { data: ModelStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const sorted = [...props.data]
      .sort((a, b) => a.total_quota - b.total_quota)
      .slice(-15)

    return {
      type: 'bar' as const,
      data: [
        {
          values: sorted.map((item) => ({
            name: item.model_name,
            value: item.total_quota / 500000,
          })),
        },
      ],
      direction: 'horizontal' as const,
      xField: 'value',
      yField: 'name',
      ...APPEAR_ANIMATION,
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) =>
          value === 0 ? '¥0' : '¥' + value.toFixed(2),
      },
      bar: { style: { cornerRadius: [0, 4, 4, 0] } },
      axes: [
        {
          orient: 'left',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            formatMethod: (v: string) =>
              v.length > 20 ? v.slice(0, 20) + '…' : v,
          },
        },
        {
          orient: 'bottom',
          type: 'linear',
          label: {
            formatMethod: (v: number) =>
              v === 0 ? '¥0' : v >= 1000 ? '¥' + (v / 1000).toFixed(0) + 'K' : '¥' + v.toFixed(0),
          },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: t('Cost'),
              value: (d: { value?: number }) => {
                const v = d.value ?? 0
                return v === 0 ? '¥0' : '¥' + v.toFixed(2)
              },
            },
          ],
        },
      },
    }
  }, [props.data, t])

  return (
    <ChartCard
      icon={DollarSign}
      title={t('Model Cost Ranking')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`model-cost-rank-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 7. 均价趋势 ──

type PriceGranularity = 'day' | 'week' | 'month'

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

function getMonthLabel(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function AvgPriceTrendChart(
  props: ChartBaseProps & {
    data: DailyStat[]
    startTimestamp: number
    endTimestamp: number
  }
) {
  const { t } = useTranslation()
  const [granularity, setGranularity] = useState<PriceGranularity>('week')

  const chartData = useMemo(() => {
    if (granularity === 'day') {
      return props.data
        .map((item) => {
          if (item.total_tokens <= 0) return null
          const costYuan = item.total_quota / 500000
          const pricePerMT = costYuan / (item.total_tokens / 1_000_000)
          return { label: item.date, value: pricePerMT }
        })
        .filter((v): v is { label: string; value: number } => v !== null)
    }

    const getLabel =
      granularity === 'week' ? getISOWeekLabel : getMonthLabel

    const buckets = new Map<
      string,
      { totalQuota: number; totalTokens: number }
    >()
    for (const item of props.data) {
      const bucketLabel = getLabel(item.date)
      const bucket = buckets.get(bucketLabel) ?? {
        totalQuota: 0,
        totalTokens: 0,
      }
      bucket.totalQuota += item.total_quota
      bucket.totalTokens += item.total_tokens
      buckets.set(bucketLabel, bucket)
    }

    const result: { label: string; value: number }[] = []
    for (const [bucketLabel, bucket] of buckets) {
      if (bucket.totalTokens <= 0) continue
      const costYuan = bucket.totalQuota / 500000
      const pricePerMT = costYuan / (bucket.totalTokens / 1_000_000)
      result.push({ label: bucketLabel, value: pricePerMT })
    }
    return result
  }, [props.data, granularity])

  const spec = useMemo(() => {
    if (chartData.length === 0) return null

    return {
      type: 'line' as const,
      data: [{ values: chartData }],
      xField: 'label',
      yField: 'value',
      point: { visible: chartData.length <= 60, size: 4 },
      line: { style: { curveType: 'monotone' } },
      ...APPEAR_ANIMATION,
      ...(chartData.length > DATA_ZOOM_THRESHOLD
        ? { dataZoom: makeDataZoom('line') }
        : {}),
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            autoHide: true,
            autoHideMethod: 'greedy',
            formatMethod: (v: string) => {
              if (v.includes('-W') || v.length === 7) return v
              return formatDateLabel(v)
            },
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (v: number) =>
              v === 0 ? '¥0' : '¥' + v.toFixed(2),
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
                '¥' + (d.value ?? 0).toFixed(2) + ' / M Tokens',
            },
          ],
        },
      },
    }
  }, [chartData, t])

  const granularityTabs: { value: PriceGranularity; label: string }[] = [
    { value: 'day', label: t('Day') },
    { value: 'week', label: t('Week') },
    { value: 'month', label: t('Month') },
  ]

  return (
    <ChartCard
      icon={DollarSign}
      title={t('Avg Price Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`avg-price-${granularity}-${props.resolvedTheme}`}
      spec={spec}
      actions={
        <div className='bg-muted/60 inline-flex h-7 rounded-lg border p-0.5'>
          {granularityTabs.map(({ value, label }) => (
            <button
              key={value}
              type='button'
              onClick={() => setGranularity(value)}
              className={`shrink-0 rounded-md px-2.5 text-xs font-medium transition-colors ${
                granularity === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    />
  )
}

// ── 8. 模型 Token 分布 ──

function ModelTokenDistChart(props: ChartBaseProps & { data: ModelStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const filtered = props.data.filter((i) => i.total_tokens > 0)
    if (filtered.length === 0) return null

    return {
      type: 'pie' as const,
      data: [
        {
          values: filtered.map((i) => ({
            name: i.model_name,
            value: i.total_tokens,
          })),
        },
      ],
      valueField: 'value',
      categoryField: 'name',
      outerRadius: 0.8,
      innerRadius: 0.5,
      ...APPEAR_ANIMATION,
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
                if (v >= 1_0000_0000)
                  return (v / 1_0000_0000).toFixed(2) + ' 亿'
                if (v >= 1_0000) return (v / 1_0000).toFixed(1) + ' 万'
                return v.toLocaleString()
              },
            },
          ],
        },
      },
      legends: { visible: false },
    }
  }, [props.data])

  if (!spec) return null

  return (
    <ChartCard
      icon={PieChart}
      title={t('Model Token Distribution')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`model-token-dist-${props.resolvedTheme}`}
      spec={spec}
    />
  )
}
