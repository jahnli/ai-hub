import { useMemo } from 'react'
import { VChart } from '@visactor/react-vchart'
import { Building2, PieChart, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'
import type { SubDepartmentStat } from '../types'

interface SubDepartmentStatsProps {
  data: SubDepartmentStat[]
}

export function SubDepartmentStats(props: SubDepartmentStatsProps) {
  const { t } = useTranslation()
  const { resolvedTheme, themeReady } = useChartTheme()

  const sortedData = useMemo(
    () => [...props.data].sort((a, b) => b.total_quota - a.total_quota),
    [props.data]
  )

  if (props.data.length === 0) {
    return null
  }

  return (
    <div className='mt-4 space-y-4'>
      <StatsTable data={sortedData} />
      <div className='grid gap-4 lg:grid-cols-2'>
        <TokenBarChart
          data={sortedData}
          themeReady={themeReady}
          resolvedTheme={resolvedTheme}
        />
        <CostPieChart
          data={sortedData}
          themeReady={themeReady}
          resolvedTheme={resolvedTheme}
        />
      </div>
    </div>
  )
}

// ── Stats Table ──

function StatsTable(props: { data: SubDepartmentStat[] }) {
  const { t } = useTranslation()

  const formatQuota = (quota: number): string => {
    return '¥' + (quota / 500000).toFixed(2)
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_0000_0000) return (tokens / 1_0000_0000).toFixed(2) + 'B'
    if (tokens >= 1_0000) return (tokens / 1_0000).toFixed(2) + 'W'
    return tokens.toLocaleString()
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Building2 className='text-primary size-5' />
          {t('Sub-department Statistics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <table className='w-full table-fixed text-sm'>
            <thead>
              <tr className='border-b'>
                <th className='text-muted-foreground py-2.5 text-left font-medium'>
                  {t('Department')}
                </th>
                <th className='text-muted-foreground py-2.5 text-right font-medium'>
                  {t('Users')}
                </th>
                <th className='text-muted-foreground py-2.5 text-right font-medium'>
                  {t('Total Cost')}
                </th>
                <th className='text-muted-foreground py-2.5 text-right font-medium'>
                  {t('Tokens')}
                </th>
                <th className='text-muted-foreground py-2.5 text-right font-medium'>
                  {t('Requests')}
                </th>
              </tr>
            </thead>
            <tbody>
              {props.data.map((item) => (
                <tr
                  key={item.department_id}
                  className='hover:bg-muted/50 border-b last:border-b-0'
                >
                  <td className='py-2.5 font-medium'>
                    {item.department_name}
                  </td>
                  <td className='whitespace-nowrap py-2.5 pl-6 text-right'>
                    <span className='text-foreground font-medium'>
                      {item.registered_users}
                    </span>
                    <span className='text-muted-foreground mx-0.5'>/</span>
                    <span className='text-muted-foreground'>{item.total_users}</span>
                  </td>
                  <td className='whitespace-nowrap py-2.5 pl-6 text-right font-medium'>
                    {formatQuota(item.total_quota)}
                  </td>
                  <td className='text-muted-foreground whitespace-nowrap py-2.5 pl-6 text-right'>
                    {formatTokens(item.total_tokens)}
                  </td>
                  <td className='text-muted-foreground whitespace-nowrap py-2.5 pl-6 text-right'>
                    {item.total_requests.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Token Bar Chart ──

interface ChartProps {
  data: SubDepartmentStat[]
  themeReady: boolean
  resolvedTheme: string | undefined
}

function TokenBarChart(props: ChartProps) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const chartData = props.data.map((item) => ({
      name: item.department_name,
      tokens: item.total_tokens,
    }))

    return {
      type: 'bar' as const,
      data: [{ values: chartData }],
      direction: 'horizontal' as const,
      xField: 'tokens',
      yField: 'name',
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => {
          if (value >= 1_0000_0000) return (value / 1_0000_0000).toFixed(1) + 'B'
          if (value >= 1_0000) return (value / 1_0000).toFixed(1) + 'W'
          return value.toLocaleString()
        },
      },
      bar: { style: { cornerRadius: [4, 4, 4, 4] } },
      axes: [
        { orient: 'left', type: 'band', label: { style: { fontSize: 12 } } },
        { orient: 'bottom', type: 'linear', visible: false },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: t('Tokens'),
              value: (datum: { tokens?: number }) =>
                (datum.tokens ?? 0).toLocaleString(),
            },
          ],
        },
      },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }
  }, [props.data, props.resolvedTheme, t])

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <BarChart3 className='text-muted-foreground size-4' />
          {t('Token Usage by Department')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-[280px]'>
          {props.themeReady && (
            <VChart
              key={`bar-${props.resolvedTheme}`}
              spec={spec}
              option={VCHART_OPTION}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Cost Pie Chart ──

function CostPieChart(props: ChartProps) {
  const { t } = useTranslation()

  const spec = useMemo(() => {
    const chartData = props.data
      .filter((item) => item.total_quota > 0)
      .map((item) => ({
        name: item.department_name,
        value: item.total_quota / 500000,
      }))

    return {
      type: 'pie' as const,
      data: [{ values: chartData }],
      valueField: 'value',
      categoryField: 'name',
      outerRadius: 0.8,
      innerRadius: 0.5,
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (_: unknown, datum: { name?: string }) =>
          datum.name ?? '',
      },
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: { name?: string }) => datum.name ?? '',
              value: (datum: { value?: number }) =>
                '¥' + (datum.value ?? 0).toFixed(2),
            },
          ],
        },
      },
      legends: { visible: false },
      theme: props.resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }
  }, [props.data, props.resolvedTheme])

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <PieChart className='text-muted-foreground size-4' />
          {t('Cost Distribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-[280px]'>
          {props.themeReady && (
            <VChart
              key={`pie-${props.resolvedTheme}`}
              spec={spec}
              option={VCHART_OPTION}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
