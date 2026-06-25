import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionPageLayout } from '@/components/layout'
import { FadeIn } from '@/components/page-transition'
import { CompactDateTimeRangePicker } from '@/features/usage-logs/components/compact-date-time-range-picker'
import { getDefaultTimeRange } from '@/features/usage-logs/lib/utils'
import { getDepartmentTree, getDepartmentStats } from './api'
import { DepartmentTreeSelect } from './components/department-tree-select'
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
            <Skeleton className='h-9 w-[200px]' />
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
          {treeQuery.isFetching && !treeQuery.isLoading && (
            <Loader2 className='text-muted-foreground size-4 animate-spin' />
          )}
          {selectedDeptId && (
            <Button
              size='sm'
              className='ml-auto gap-1.5'
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
          {treeQuery.isLoading && <DepartmentTreeSkeleton />}

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

          {statsQuery.data?.data && (
            <DepartmentStatsCards stat={statsQuery.data.data} />
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
    if (tokens >= 1_0000_0000) {
      return t('{{value}}B tokens', {
        value: (tokens / 1_0000_0000).toFixed(2),
      })
    }
    if (tokens >= 1_0000) {
      return t('{{value}}W tokens', {
        value: (tokens / 1_0000).toFixed(2),
      })
    }
    return tokens.toLocaleString()
  }

  const formatQuota = (quota: number): string => {
    const yuan = quota / 500000
    return '¥' + yuan.toFixed(2)
  }

  const formatRequests = (count: number): string => {
    if (count >= 1_0000) {
      return t('{{value}}W requests', {
        value: (count / 1_0000).toFixed(2),
      })
    }
    return t('{{value}} requests', { value: count.toLocaleString() })
  }

  const formatAvgTime = (seconds: number): string => {
    return seconds.toFixed(1) + 's'
  }

  const formatErrorRate = (rate: number): string => {
    return rate.toFixed(1) + '%'
  }

  const formatAvgPrice = (price: number): string => {
    return '¥' + price.toFixed(2) + ' / M Tokens'
  }

  const cards = [
    { title: t('Total Tokens'), value: formatTokens(stat.total_tokens) },
    { title: t('Total Cost'), value: formatQuota(stat.total_quota) },
    { title: t('Avg Price'), value: formatAvgPrice(stat.avg_price_per_mt) },
    { title: t('Total Requests'), value: formatRequests(stat.total_requests) },
    { title: t('Avg Response Time'), value: formatAvgTime(stat.avg_use_time) },
    { title: t('Error Rate'), value: formatErrorRate(stat.error_rate) },
    { title: t('Registered Users'), value: stat.registered_users.toString() },
    { title: t('Unregistered Users'), value: stat.unregistered_users.toString() },
  ]

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {cards.map((card) => (
        <Card key={card.title} size='sm'>
          <CardHeader>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold tracking-tight'>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DepartmentTreeSkeleton() {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-9 w-[200px]' />
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-28 rounded-xl' />
        ))}
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
