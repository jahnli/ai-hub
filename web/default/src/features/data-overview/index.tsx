import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Building2,
  Coins,
  DollarSign,
  Hash,
  Layers,
  Loader2,
  Search,
  Timer,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionPageLayout } from '@/components/layout'
import { FadeIn } from '@/components/page-transition'
import { CompactDateTimeRangePicker } from '@/features/usage-logs/components/compact-date-time-range-picker'
import { getDefaultTimeRange } from '@/features/usage-logs/lib/utils'
import { getDepartmentTree, getDepartmentStats, getSubDepartmentStats, getUsageAnalysis } from './api'
import { DepartmentTreeSelect } from './components/department-tree-select'
import { SubDepartmentStats } from './components/sub-department-stats'
import { UsageAnalysisSection } from './components/usage-analysis'
import type { DeptTreeNode, DepartmentStat } from './types'

export function DataOverview() {
  const { t } = useTranslation()
  const [selectedDeptId, setSelectedDeptId] = useState<string>()
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(
    getDefaultTimeRange
  )
  const [queryParams, setQueryParams] = useState<{
    department_id: string
    start_timestamp: number
    end_timestamp: number
  } | null>(null)

  const treeQuery = useQuery({
    queryKey: ['department', 'tree'],
    queryFn: getDepartmentTree,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const statsQuery = useQuery({
    queryKey: ['department', 'stats', queryParams],
    queryFn: () => getDepartmentStats(queryParams!),
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const subStatsQuery = useQuery({
    queryKey: ['department', 'sub-stats', queryParams],
    queryFn: () => getSubDepartmentStats(queryParams!),
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const usageQuery = useQuery({
    queryKey: ['department', 'usage-analysis', queryParams],
    queryFn: () => getUsageAnalysis(queryParams!),
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const treeData = treeQuery.data?.data
  const displayTreeData = useMemo(() => {
    if (!treeData) return []
    const tenantName = treeData.tenant_info?.name
    if (!tenantName || treeData.tree_data[0]?.value === '__tenant__') {
      return treeData.tree_data
    }
    return [
      {
        value: '__tenant__',
        label: tenantName,
        disabled: false,
        children: treeData.tree_data,
      },
    ]
  }, [treeData])

  useEffect(() => {
    if (treeData && !selectedDeptId) {
      const leaderIds = treeData.leader_dept_ids
      if (leaderIds && leaderIds.length > 0) {
        setSelectedDeptId(leaderIds[0])
      } else if (displayTreeData.length > 0) {
        const firstSelectable = findFirstSelectable(displayTreeData)
        if (firstSelectable) {
          setSelectedDeptId(firstSelectable.value)
        }
      }
    }
  }, [displayTreeData, treeData, selectedDeptId])

  const handleDeptChange = (deptId: string, _node: DeptTreeNode) => {
    setSelectedDeptId(deptId)
  }

  const handleSearch = () => {
    if (!selectedDeptId) return
    setQueryParams({
      department_id: selectedDeptId,
      start_timestamp: dateRange.start
        ? Math.floor(dateRange.start.getTime() / 1000)
        : 0,
      end_timestamp: dateRange.end
        ? Math.floor(dateRange.end.getTime() / 1000)
        : 0,
    })
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div className='flex items-center gap-3'>
          <span>{t('Data Overview')}</span>
          {treeQuery.isLoading ? (
            <Skeleton className='h-8 w-[200px]' />
          ) : treeData ? (
            <DepartmentTreeSelect
              treeData={displayTreeData}
              value={selectedDeptId}
              onValueChange={handleDeptChange}
              disabled={treeQuery.isFetching}
            />
          ) : null}
          <CompactDateTimeRangePicker
            start={dateRange.start}
            end={dateRange.end}
            onChange={setDateRange}
            className='max-w-[280px]'
          />
          {selectedDeptId && (
            <Button
              className='gap-1.5'
              onClick={handleSearch}
              disabled={statsQuery.isFetching}
            >
              {statsQuery.isFetching ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Search className='size-3.5' />
              )}
              {t('Search')}
            </Button>
          )}
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <FadeIn>
          {treeQuery.isError && (
            <Alert variant='destructive'>
              <AlertCircle className='size-4' />
              <AlertTitle>{t('Failed to load department tree')}</AlertTitle>
              <AlertDescription>
                {treeQuery.error instanceof Error
                  ? treeQuery.error.message
                  : t('An unexpected error occurred')}
              </AlertDescription>
            </Alert>
          )}

          {treeData && displayTreeData.length === 0 && (
            <div className='flex flex-col items-center justify-center py-16'>
              <Building2 className='text-muted-foreground mb-4 size-12' />
              <p className='text-muted-foreground text-sm'>
                {t('No departments available')}
              </p>
            </div>
          )}

          {statsQuery.isError && (
            <Alert variant='destructive'>
              <AlertCircle className='size-4' />
              <AlertTitle>{t('Failed to load statistics')}</AlertTitle>
              <AlertDescription>
                {statsQuery.error instanceof Error
                  ? statsQuery.error.message
                  : t('An unexpected error occurred')}
              </AlertDescription>
            </Alert>
          )}

          {statsQuery.isFetching && !statsQuery.data && (
            <div className='overflow-hidden rounded-lg border'>
              <div className='divide-border/60 grid min-w-0 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-4'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className='min-w-0 px-3 py-2.5 sm:px-5 sm:py-4'>
                    <Skeleton className='h-3.5 w-20' />
                    <Skeleton className='mt-2 h-7 w-24' />
                  </div>
                ))}
              </div>
            </div>
          )}

          {statsQuery.data?.data && (
            <DepartmentStatsCards stat={statsQuery.data.data} />
          )}

          {subStatsQuery.isFetching && !subStatsQuery.data && (
            <Card className='mt-4'>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Building2 className='text-primary size-5' />
                  {t('Sub-department Statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='text-muted-foreground size-6 animate-spin' />
                </div>
              </CardContent>
            </Card>
          )}

          {subStatsQuery.data?.data && subStatsQuery.data.data.length > 0 && (
            <SubDepartmentStats data={subStatsQuery.data.data} />
          )}

          {usageQuery.isFetching && !usageQuery.data && (
            <Card className='mt-4'>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <BarChart3 className='text-primary size-5' />
                  {t('Usage Analysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='text-muted-foreground size-6 animate-spin' />
                </div>
              </CardContent>
            </Card>
          )}

          {usageQuery.data?.data && queryParams && (
            <UsageAnalysisSection
              data={usageQuery.data.data}
              startTimestamp={queryParams.start_timestamp}
              endTimestamp={queryParams.end_timestamp}
            />
          )}
        </FadeIn>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

function DepartmentStatsCards(props: { stat: DepartmentStat }) {
  const { t } = useTranslation()
  const { stat } = props

  const formatTokens = (tokens: number): string => {
    if (tokens === 0) return '0'
    return (tokens / 1_0000_0000).toFixed(2) + ' 亿'
  }

  const formatQuota = (quota: number): string => {
    if (quota === 0) return '¥0'
    const yuan = quota / 500000
    return '¥' + yuan.toFixed(2)
  }

  const formatRequests = (count: number): string => {
    if (count >= 1_0000) {
      return (count / 1_0000).toFixed(2) + ' 万'
    }
    return count.toLocaleString()
  }

  const items: { title: string; value: string; desc: string; icon: LucideIcon; valueClassName?: string }[] = [
    { title: t('Total Tokens'), value: formatTokens(stat.total_tokens), desc: t('Statistical tokens'), icon: Layers },
    { title: t('Total Cost'), value: formatQuota(stat.total_quota), desc: t('Statistical quota'), icon: Coins },
    { title: t('Avg Price'), value: (stat.avg_price_per_mt === 0 ? '¥0' : '¥' + stat.avg_price_per_mt.toFixed(2)) + ' / MT', desc: t('Average price per million tokens'), icon: DollarSign },
    { title: t('Total Requests'), value: formatRequests(stat.total_requests), desc: t('Statistical count'), icon: Hash },
    { title: t('Registered Count'), value: stat.registered_users.toLocaleString(), desc: t('Registered people count'), icon: UserCheck, valueClassName: 'text-emerald-600 dark:text-emerald-400' },
    { title: t('Unregistered Count'), value: stat.unregistered_users.toLocaleString(), desc: t('Unregistered people count'), icon: UserX, valueClassName: 'text-amber-600 dark:text-amber-400' },
    { title: t('Avg Response Time'), value: stat.avg_use_time.toFixed(1) + 's', desc: t('Average response time'), icon: Timer },
    { title: t('Error Rate'), value: stat.error_rate.toFixed(1) + '%', desc: t('Request error rate'), icon: AlertTriangle },
  ]

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='divide-border/60 grid min-w-0 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-4'>
        {items.map((it, idx) => {
          const Icon = it.icon
          return (
            <div
              key={it.title}
              className={cn(
                'min-w-0 px-3 py-2.5 sm:px-5 sm:py-4',
                idx === items.length - 1 &&
                  items.length % 2 !== 0 &&
                  'col-span-2 sm:col-span-1'
              )}
            >
              <div className='flex min-w-0 items-center gap-2'>
                <Icon className='text-muted-foreground/60 size-3.5 shrink-0' />
                <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                  {it.title}
                </div>
              </div>
              <div className={cn('mt-1.5 max-w-full truncate font-mono text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl', it.valueClassName || 'text-foreground')}>
                {it.value}
              </div>
              <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
                {it.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function findFirstSelectable(nodes: DeptTreeNode[]): DeptTreeNode | null {
  for (const node of nodes) {
    if (!node.disabled) return node
    const child = findFirstSelectable(node.children)
    if (child) return child
  }
  return null
}
