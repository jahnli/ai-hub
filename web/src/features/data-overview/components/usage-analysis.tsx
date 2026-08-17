import { VChart } from '@visactor/react-vchart'
import {
  ChartLine,
  DollarSign,
  Hash,
  Layers,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import { useMemo, type ElementType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateUnitPricePer100MTokens } from '@/lib/unit-price'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'

import {
  buildModelCallDistributionData,
  buildModelCostRankData,
  buildCostBucketDistributionData,
} from '../lib/usage-analysis-chart-data'
import type {
  CostBucket,
  DailyStat,
  ModelDailyStat,
  ModelStat,
  UsageAnalysis,
} from '../types'

interface UsageAnalysisProps {
  data: UsageAnalysis
  costBuckets?: CostBucket[]
}

export function UsageAnalysisSection(props: UsageAnalysisProps) {
  const { t } = useTranslation()
  const { resolvedTheme, themeReady } = useChartTheme()
  const hasModelData =
    props.data.model_stats && props.data.model_stats.length > 0
  const modelSeriesStats = props.data.model_series_stats ?? []
  const hasModelSeriesData = modelSeriesStats.length > 0
  const hasDailyData =
    props.data.daily_stats && props.data.daily_stats.length > 0
  const hasCostBuckets = props.costBuckets && props.costBuckets.length > 0

  if (
    !hasModelData &&
    !hasModelSeriesData &&
    !hasDailyData &&
    !hasCostBuckets
  ) {
    return null
  }

  const quotaToCnyRate = props.data.quota_to_cny || 1 / 500000
  const chartProps = { themeReady, resolvedTheme, quotaToCnyRate }

  return (
    <Card className='mt-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <ChartLine className='text-primary size-5' />
          {t('Usage Analysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='grid grid-cols-1 lg:grid-cols-2'>
          {hasCostBuckets && (
            <CostBucketDistributionChart
              data={props.costBuckets ?? []}
              {...chartProps}
            />
          )}
          {hasModelSeriesData && (
            <ModelCallDistributionChart
              data={modelSeriesStats}
              title={t('Model Series Call Distribution')}
              chartKeyPrefix='model-series-call-distribution'
              {...chartProps}
            />
          )}
          {hasModelSeriesData && (
            <ModelCostRankChart
              data={modelSeriesStats}
              title={t('Model Series Consumption Ranking')}
              chartKeyPrefix='model-series-cost-rank'
              {...chartProps}
            />
          )}
          {hasModelData && (
            <ModelCallDistributionChart
              data={props.data.model_stats}
              title={t('Model Call Distribution')}
              chartKeyPrefix='model-call-distribution'
              {...chartProps}
            />
          )}
          {hasModelData && (
            <ModelCostRankChart
              data={props.data.model_stats}
              title={t('Model Consumption Ranking')}
              chartKeyPrefix='model-cost-rank'
              limit={15}
              {...chartProps}
            />
          )}
          {hasDailyData && (
            <CostTrendChart data={props.data.daily_stats} {...chartProps} />
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
        </div>
      </CardContent>
    </Card>
  )
}

// ── Shared ──

interface ChartBaseProps {
  themeReady: boolean
  resolvedTheme: string | undefined
  quotaToCnyRate: number
}

function ChartCard(props: {
  icon: ElementType
  title: string
  actions?: ReactNode
  themeReady: boolean
  resolvedTheme: string | undefined
  chartKey: string
  spec: object | null
  height?: string
}) {
  const Icon = props.icon
  return (
    <div className='border-border/60 border-b last:border-b-0 lg:odd:border-r [&:nth-last-child(2)]:lg:border-b-0'>
      <div className='flex w-full items-center justify-between px-5 py-3'>
        <div className='flex items-center gap-2'>
          <Icon className='text-muted-foreground/60 size-4' />
          <h3 data-chart-title={props.title} className='text-sm font-semibold'>
            {props.title}
          </h3>
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
  if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(2) + ' 亿'
  if (v >= 1_0000) return (v / 1_0000).toFixed(2) + ' 万'
  return v.toLocaleString()
}

function formatTokenValue(v: number): string {
  if (v === 0) return '0'
  return (v / 1_0000_0000).toFixed(2) + ' 亿'
}

function formatTokensDetail(tokens: number): string {
  if (tokens <= 0) return '-'
  return tokens.toLocaleString()
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
      dimension: {
        content: [
          {
            key: tooltipKey,
            value: (d: { value?: number }) => tooltipFormat(d.value ?? 0),
          },
        ],
      },
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

function formatCost(value: number): string {
  if (value === 0) return '¥0'
  return `¥${value.toFixed(2)}`
}

function formatCompactCost(value: number): string {
  if (value === 0) return '¥0'
  if (value >= 1000) return `¥${(value / 1000).toFixed(0)}K`
  return `¥${value.toFixed(0)}`
}

function formatUnitPrice(
  cost: number,
  tokens: number,
  unitLabel: string
): string {
  if (tokens <= 0) return '-'
  const pricePer100MTokens = calculateUnitPricePer100MTokens(cost, tokens)
  return `¥${pricePer100MTokens.toFixed(2)}/${unitLabel}`
}

// ── 1. 请求次数趋势 ──

function RequestTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_requests,
    }))
    return makeAreaSpec(
      values,
      (v) => formatLargeNumber(v) + ' ' + t('times'),
      t('Requests'),
      (v) => formatLargeNumber(v) + ' ' + t('times')
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
      height='h-[340px]'
    />
  )
}

// ── 2. Token 用量趋势 ──

function TokenTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_tokens,
      cost: item.total_quota * props.quotaToCnyRate,
    }))

    const tooltipContent = [
      {
        key: () => 'Token',
        value: (d: { value?: number }) => formatTokensDetail(d.value ?? 0),
      },
      {
        key: () => t('Total Cost'),
        value: (d: { cost?: number }) => formatCost(d.cost ?? 0),
      },
      {
        key: () => t('Unit Price'),
        value: (d: { cost?: number; value?: number }) =>
          formatUnitPrice(d.cost ?? 0, d.value ?? 0, t('100M Tokens')),
      },
    ]

    return {
      type: 'area' as const,
      data: [{ values }],
      xField: 'date',
      yField: 'value',
      point: { visible: values.length <= 60, size: 4 },
      line: { style: { curveType: 'monotone' } },
      area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
      ...APPEAR_ANIMATION,
      ...(values.length > DATA_ZOOM_THRESHOLD
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
          label: { formatMethod: (v: number) => formatTokenValue(v) },
        },
      ],
      tooltip: {
        dimension: {
          content: tooltipContent,
        },
        mark: {
          title: { value: (d: { date?: string }) => d.date ?? '' },
          content: tooltipContent,
        },
      },
    }
  }, [props.data, props.quotaToCnyRate, t])

  return (
    <ChartCard
      icon={Layers}
      title={t('Token Usage Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`token-trend-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 3. 模型使用趋势 ──

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
            formatMethod: (v: number) => formatTokenValue(v),
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
        dimension: {
          content: [
            {
              key: (d: { model?: string }) => d.model ?? '',
              value: (d: { tokens?: number }) =>
                formatTokenValue(d.tokens ?? 0),
            },
          ],
        },
        mark: {
          title: { value: (d: { date?: string }) => d.date ?? '' },
          content: [
            {
              key: (d: { model?: string }) => d.model ?? '',
              value: (d: { tokens?: number }) =>
                formatTokenValue(d.tokens ?? 0),
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

// ── 4. 模型调用分布 ──

function ModelCallDistributionChart(
  props: ChartBaseProps & {
    data: ModelStat[]
    title: string
    chartKeyPrefix: string
  }
) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const chartData = buildModelCallDistributionData(
      props.data,
      props.quotaToCnyRate
    )
    if (!chartData) return null

    return {
      type: 'pie' as const,
      data: [
        {
          values: chartData.values,
        },
      ],
      valueField: 'value',
      categoryField: 'name',
      outerRadius: 0.8,
      innerRadius: 0.5,
      pie: {
        state: {
          hover: {
            outerRadius: 0.88,
            stroke: '#fff',
            lineWidth: 2,
          },
        },
      },
      animationAppear: {
        duration: 800,
        easing: 'cubicOut',
        preset: 'growRadiusIn',
      },
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (
          _: unknown,
          datum: { name?: string; value?: number }
        ) => {
          const name = datum.name ?? ''
          const pct =
            chartData.totalRequests > 0
              ? (((datum.value ?? 0) / chartData.totalRequests) * 100).toFixed(
                  2
                ) + '%'
              : ''
          return pct ? `${name} ${pct}` : name
        },
      },
      tooltip: {
        mark: {
          content: [
            {
              key: () => t('Requests'),
              value: (datum: { value?: number }) =>
                formatLargeNumber(datum.value ?? 0) + ' ' + t('times'),
            },
            {
              key: () => 'Token',
              value: (datum: { tokens?: number }) =>
                formatTokensDetail(datum.tokens ?? 0),
            },
            {
              key: () => t('Total Cost'),
              value: (datum: { cost?: number }) => formatCost(datum.cost ?? 0),
            },
          ],
        },
      },
      legends: {
        visible: true,
        orient: 'right',
        type: 'discrete',
        item: {
          width: 120,
          label: {
            style: { fontSize: 11 },
            formatMethod: (label: string) =>
              label.length > 12 ? label.slice(0, 12) + '…' : label,
          },
        },
        maxRow: 12,
        autoPage: true,
      },
    }
  }, [props.data, props.quotaToCnyRate, t])

  if (!spec) return null

  return (
    <ChartCard
      icon={PieChart}
      title={props.title}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`${props.chartKeyPrefix}-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 5. 模型消耗排行 ──

function ModelCostRankChart(
  props: ChartBaseProps & {
    data: ModelStat[]
    title: string
    chartKeyPrefix: string
    limit?: number
  }
) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const sorted = buildModelCostRankData(
      props.data,
      props.quotaToCnyRate,
      props.limit
    )

    return {
      type: 'bar' as const,
      data: [
        {
          values: sorted,
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
            formatMethod: (v: number) => formatCompactCost(v),
          },
        },
      ],
      tooltip: {
        dimension: {
          content: [
            {
              key: () => t('Total Cost'),
              value: (d: { value?: number }) => formatCost(d.value ?? 0),
            },
            {
              key: () => 'Token',
              value: (d: { tokens?: number }) =>
                formatTokensDetail(d.tokens ?? 0),
            },
            {
              key: () => t('Requests'),
              value: (d: { requests?: number }) =>
                formatLargeNumber(d.requests ?? 0) + ' ' + t('times'),
            },
            {
              key: () => t('Unit Price'),
              value: (d: { value?: number; tokens?: number }) =>
                formatUnitPrice(d.value ?? 0, d.tokens ?? 0, t('100M Tokens')),
            },
          ],
        },
        mark: {
          content: [
            {
              key: () => t('Total Cost'),
              value: (d: { value?: number }) => formatCost(d.value ?? 0),
            },
            {
              key: () => 'Token',
              value: (d: { tokens?: number }) =>
                formatTokensDetail(d.tokens ?? 0),
            },
            {
              key: () => t('Requests'),
              value: (d: { requests?: number }) =>
                formatLargeNumber(d.requests ?? 0) + ' ' + t('times'),
            },
            {
              key: () => t('Unit Price'),
              value: (d: { value?: number; tokens?: number }) =>
                formatUnitPrice(d.value ?? 0, d.tokens ?? 0, t('100M Tokens')),
            },
          ],
        },
      },
    }
  }, [props.data, props.limit, props.quotaToCnyRate, t])

  return (
    <ChartCard
      icon={DollarSign}
      title={props.title}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`${props.chartKeyPrefix}-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 6. 费用趋势 ──

function CostTrendChart(props: ChartBaseProps & { data: DailyStat[] }) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const values = props.data.map((item) => ({
      date: item.date,
      value: item.total_quota * props.quotaToCnyRate,
      tokens: item.total_tokens,
      requests: item.total_requests,
    }))

    return {
      type: 'area' as const,
      data: [{ values }],
      xField: 'date',
      yField: 'value',
      point: { visible: values.length <= 60, size: 4 },
      line: { style: { curveType: 'monotone' } },
      area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
      ...APPEAR_ANIMATION,
      ...(values.length > DATA_ZOOM_THRESHOLD
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
            formatMethod: (value: string) => formatDateLabel(value),
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (value: number) => formatCompactCost(value),
          },
        },
      ],
      tooltip: {
        dimension: {
          content: [
            {
              key: () => t('Total Cost'),
              value: (datum: { value?: number }) =>
                formatCost(datum.value ?? 0),
            },
            {
              key: () => 'Token',
              value: (datum: { tokens?: number }) =>
                formatTokensDetail(datum.tokens ?? 0),
            },
            {
              key: () => t('Requests'),
              value: (datum: { requests?: number }) =>
                formatLargeNumber(datum.requests ?? 0) + ' ' + t('times'),
            },
            {
              key: () => t('Unit Price'),
              value: (datum: { value?: number; tokens?: number }) =>
                formatUnitPrice(
                  datum.value ?? 0,
                  datum.tokens ?? 0,
                  t('100M Tokens')
                ),
            },
          ],
        },
        mark: {
          title: { value: (datum: { date?: string }) => datum.date ?? '' },
          content: [
            {
              key: () => t('Total Cost'),
              value: (datum: { value?: number }) =>
                formatCost(datum.value ?? 0),
            },
            {
              key: () => 'Token',
              value: (datum: { tokens?: number }) =>
                formatTokensDetail(datum.tokens ?? 0),
            },
            {
              key: () => t('Requests'),
              value: (datum: { requests?: number }) =>
                formatLargeNumber(datum.requests ?? 0) + ' ' + t('times'),
            },
            {
              key: () => t('Unit Price'),
              value: (datum: { value?: number; tokens?: number }) =>
                formatUnitPrice(
                  datum.value ?? 0,
                  datum.tokens ?? 0,
                  t('100M Tokens')
                ),
            },
          ],
        },
      },
    }
  }, [props.data, props.quotaToCnyRate, t])

  return (
    <ChartCard
      icon={DollarSign}
      title={t('Quota Consumption Trend')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`cost-trend-${props.resolvedTheme}`}
      spec={spec}
      height='h-[340px]'
    />
  )
}

// ── 费用分布柱状图 ──

function CostBucketDistributionChart(
  props: ChartBaseProps & { data: CostBucket[] }
) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const chartData = buildCostBucketDistributionData(props.data, {
      zeroSpend: t('Spent ¥0'),
      overMin: (min: number) => t('Spent over ¥{{min}}', { min }),
      between: (min: number, max: number) =>
        t('Spent ¥{{min}}~¥{{max}}', { min, max }),
    })

    if (!chartData) return null

    return {
      type: 'bar' as const,
      data: [{ values: chartData.values }],
      xField: 'range',
      yField: 'users',
      ...APPEAR_ANIMATION,
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            autoRotate: true,
            autoHide: true,
            autoHideMethod: 'greedy',
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (v: number) => {
              if (v >= 1_0000) return `${(v / 1_0000).toFixed(1)}万`
              return v.toFixed(0)
            },
          },
        },
      ],
      bar: {
        style: {
          cornerRadius: [4, 4, 0, 0],
        },
      },
      label: {
        visible: true,
        position: 'top',
        style: {
          fontSize: 11,
          fontWeight: 500,
        },
        formatMethod: (value: number) => {
          if (value >= 1_0000) return `${(value / 1_0000).toFixed(1)}万`
          return value.toString()
        },
      },
      tooltip: {
        mark: {
          title: { value: (datum: { range?: string }) => datum.range ?? '' },
          content: [
            {
              key: () => t('Number of Users'),
              value: (datum: { users?: number }) =>
                (datum.users ?? 0).toString(),
            },
          ],
        },
      },
    }
  }, [props.data, t])

  return (
    <ChartCard
      icon={TrendingUp}
      title={t('Cost Distribution by User Count')}
      themeReady={props.themeReady}
      resolvedTheme={props.resolvedTheme}
      chartKey={`cost-bucket-distribution-${props.resolvedTheme}`}
      spec={spec}
    />
  )
}
