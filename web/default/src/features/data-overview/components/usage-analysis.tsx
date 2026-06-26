import { useMemo, useState } from 'react'
import { VChart } from '@visactor/react-vchart'
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'
import type { UsageAnalysis } from '../types'

interface UsageAnalysisProps {
  data: UsageAnalysis
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
        {hasDailyData && (
          <DailyTrendChart
            data={props.data.daily_stats}
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
      direction: 'horizontal' as const,
      xField: 'requests',
      yField: 'name',
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => {
          if (value >= 1_0000) return (value / 1_0000).toFixed(1) + 'W'
          return value.toLocaleString()
        },
      },
      bar: { style: { cornerRadius: [4, 4, 4, 4] } },
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
        { orient: 'bottom', type: 'linear', visible: false },
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
              value: (d: { value?: number }) =>
                '¥' + (d.value ?? 0).toFixed(2),
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

// ── Daily Trend Chart ──

function DailyTrendChart(props: ChartProps) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<'tokens' | 'requests'>('tokens')

  const spec = useMemo(
    () => ({
      type: 'area' as const,
      data: [
        {
          values: props.data.map(
            (item: {
              date: string
              total_tokens: number
              total_requests: number
            }) => ({
              date: item.date,
              value:
                metric === 'tokens' ? item.total_tokens : item.total_requests,
            })
          ),
        },
      ],
      xField: 'date',
      yField: 'value',
      point: { visible: true, size: 4 },
      line: { style: { curveType: 'monotone' } },
      area: { style: { fillOpacity: 0.15, curveType: 'monotone' } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: { fontSize: 11 },
            formatMethod: (v: string) => {
              const parts = v.split('-')
              return parts.length === 3 ? parts[1] + '-' + parts[2] : v
            },
          },
        },
        {
          orient: 'left',
          type: 'linear',
          label: {
            formatMethod: (v: number) => {
              if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(1) + 'B'
              if (v >= 1_0000) return (v / 1_0000).toFixed(0) + 'W'
              return v.toLocaleString()
            },
          },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: metric === 'tokens' ? 'Tokens' : t('Requests'),
              value: (d: { value?: number }) =>
                (d.value ?? 0).toLocaleString(),
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }),
    [props.data, props.resolvedTheme, metric, t]
  )

  const tabs = [
    { value: 'tokens' as const, label: 'Tokens' },
    { value: 'requests' as const, label: t('Requests') },
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
      <div className='h-[300px] p-2'>
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
