import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { VChart } from '@visactor/react-vchart'
import { Building2, PieChart, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DataTableView, useDataTable } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartTheme } from '@/lib/use-chart-theme'
import { VCHART_OPTION } from '@/lib/vchart'
import type { SubDepartmentStat } from '../types'

interface SubDepartmentStatsProps {
  data: SubDepartmentStat[]
}

function formatQuota(quota: number): string {
  return '¥' + (quota / 500000).toFixed(2)
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_0000_0000) return (tokens / 1_0000_0000).toFixed(2) + 'B'
  if (tokens >= 1_0000) return (tokens / 1_0000).toFixed(2) + 'W'
  return tokens.toLocaleString()
}

function useSubDepartmentColumns(): ColumnDef<SubDepartmentStat>[] {
  const { t } = useTranslation()

  return useMemo(
    (): ColumnDef<SubDepartmentStat>[] => [
      {
        accessorKey: 'department_name',
        header: t('Department'),
        enableSorting: false,
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.department_name}</span>
        ),
        size: 200,
      },
      {
        id: 'users',
        accessorFn: (row) => row.registered_users,
        header: t('Registered/Total'),
        cell: ({ row }) => (
          <div className='whitespace-nowrap'>
            <span className='font-medium'>
              {row.original.registered_users}
            </span>
            <span className='text-muted-foreground mx-0.5'>/</span>
            <span className='text-muted-foreground'>
              {row.original.total_users}
            </span>
          </div>
        ),
        size: 140,
      },
      {
        accessorKey: 'total_tokens',
        header: t('Tokens'),
        cell: ({ row }) => (
          <span className='text-muted-foreground font-mono'>
            {formatTokens(row.original.total_tokens)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'total_quota',
        header: t('Total Cost'),
        cell: ({ row }) => (
          <span className='font-medium font-mono'>
            {formatQuota(row.original.total_quota)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'total_requests',
        header: t('Request Count'),
        cell: ({ row }) => (
          <span className='text-muted-foreground font-mono'>
            {row.original.total_requests.toLocaleString()}
          </span>
        ),
        size: 120,
      },
    ],
    [t]
  )
}

export function SubDepartmentStats(props: SubDepartmentStatsProps) {
  const { t } = useTranslation()
  const { resolvedTheme, themeReady } = useChartTheme()
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar')
  const columns = useSubDepartmentColumns()

  const sortedData = useMemo(
    () => [...props.data].sort((a, b) => b.total_quota - a.total_quota),
    [props.data]
  )

  const { table } = useDataTable({
    data: sortedData,
    columns,
    initialSorting: [{ id: 'total_quota', desc: true }],
    withPaginationRowModel: false,
    withFilteredRowModel: false,
    withFacetedRowModel: false,
  })

  const barSpec = useMemo(
    () => ({
      type: 'bar' as const,
      data: [
        {
          values: sortedData.map((item) => ({
            name: item.department_name,
            tokens: item.total_tokens,
          })),
        },
      ],
      xField: 'name',
      yField: 'tokens',
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => {
          if (value >= 1_0000_0000)
            return (value / 1_0000_0000).toFixed(1) + 'B'
          if (value >= 1_0000) return (value / 1_0000).toFixed(1) + 'W'
          return value.toLocaleString()
        },
      },
      bar: { style: { cornerRadius: [4, 4, 4, 4] } },
      axes: [
        {
          orient: 'bottom',
          type: 'band',
          label: {
            style: {
              fontSize: 11,
              angle: -45,
              textAlign: 'right',
              textBaseline: 'middle',
            },
            formatMethod: (v: string) =>
              v.length > 12 ? v.slice(0, 12) + '…' : v,
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
              key: t('Tokens'),
              value: (d: { tokens?: number }) =>
                (d.tokens ?? 0).toLocaleString(),
            },
          ],
        },
      },
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }),
    [sortedData, resolvedTheme, t]
  )

  const pieSpec = useMemo(
    () => ({
      type: 'pie' as const,
      data: [
        {
          values: sortedData
            .filter((i) => i.total_quota > 0)
            .map((i) => ({
              name: i.department_name,
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
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      background: 'transparent',
    }),
    [sortedData, resolvedTheme]
  )

  const chartTabs = [
    {
      value: 'bar' as const,
      icon: BarChart3,
      label: t('Token Usage by Department'),
    },
    { value: 'pie' as const, icon: PieChart, label: t('Cost Distribution') },
  ]

  if (props.data.length === 0) {
    return null
  }

  return (
    <Card className='mt-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Building2 className='text-primary size-5' />
          {t('Sub-department Statistics')}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {/* Table */}
        <div className='px-2 pb-4'>
          <DataTableView
            table={table}
            containerClassName='border-0 shadow-none'
            applyHeaderSize
          />
        </div>

        {/* Chart section */}
        <div className='border-t'>
          <div className='flex w-full items-center justify-between px-5 py-3'>
            <div className='flex items-center gap-2'>
              {chartView === 'bar' ? (
                <BarChart3 className='text-muted-foreground/60 size-4' />
              ) : (
                <PieChart className='text-muted-foreground/60 size-4' />
              )}
              <span className='text-sm font-semibold'>
                {chartView === 'bar'
                  ? t('Token Usage by Department')
                  : t('Cost Distribution')}
              </span>
            </div>
            <div className='bg-muted/60 inline-flex h-7 rounded-lg border p-0.5'>
              {chartTabs.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setChartView(value)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                    chartView === value
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
            {themeReady && (
              <VChart
                key={`${chartView}-${resolvedTheme}`}
                spec={chartView === 'bar' ? barSpec : pieSpec}
                option={VCHART_OPTION}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
