import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, Loader2, Search } from 'lucide-react'
import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { FadeIn } from '@/components/page-transition'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompactDateTimeRangePicker } from '@/features/usage-logs/components/compact-date-time-range-picker'
import dayjs from '@/lib/dayjs'

import {
  getDepartmentTree,
  getDepartmentStats,
  getSubDepartmentStats,
  getUsageAnalysis,
} from './api'
import { DepartmentStatsCards } from './components/department-stats-cards'
import { DepartmentTreeSelect } from './components/department-tree-select'
import { DepartmentUsersTable } from './components/department-users-table'
import { ExportDialog } from './components/export-dialog'
import { NotifySettingsDialog } from './components/notify-settings-dialog'
import { SubDepartmentStats } from './components/sub-department-stats'
import { UsageAnalysisSection } from './components/usage-analysis'
import {
  createDepartmentQueryParams,
  findDepartmentNodeByValue,
  findFirstSelectableNode,
  isDepartmentNodeDisabled,
} from './lib/department-selection'
import type { DepartmentQueryParams, DeptTreeNode } from './types'

const STATS_SKELETON_KEYS = Array.from(
  { length: 10 },
  (_, index) => `stats-skeleton-${index}`
)
const USAGE_ANALYSIS_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, index) => `usage-analysis-skeleton-${index}`
)
const EMPTY_DEPARTMENT_TREE: DeptTreeNode[] = []

export function DataOverview() {
  const { t } = useTranslation()
  const [selectedNode, setSelectedNode] = useState<DeptTreeNode | null>(null)
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(
    () => ({
      start: dayjs().startOf('month').toDate(),
      end: dayjs().endOf('month').toDate(),
    })
  )
  const [queryParams, setQueryParams] = useState<DepartmentQueryParams | null>(
    null
  )

  const treeQuery = useQuery({
    queryKey: ['department', 'tree'],
    queryFn: getDepartmentTree,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const statsQuery = useQuery({
    queryKey: ['department', 'stats', queryParams],
    queryFn: () => {
      if (!queryParams) throw new Error('Missing query params')
      return getDepartmentStats(queryParams)
    },
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const subStatsQuery = useQuery({
    queryKey: ['department', 'sub-stats', queryParams],
    queryFn: () => {
      if (!queryParams) throw new Error('Missing query params')
      return getSubDepartmentStats(queryParams)
    },
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const usageQuery = useQuery({
    queryKey: ['department', 'usage-analysis', queryParams],
    queryFn: () => {
      if (!queryParams) throw new Error('Missing query params')
      return getUsageAnalysis(queryParams)
    },
    enabled: !!queryParams,
    staleTime: 60 * 1000,
  })

  const treeData = treeQuery.data?.data
  const displayTreeData = treeData?.tree_data ?? EMPTY_DEPARTMENT_TREE

  useEffect(() => {
    if (!treeData || selectedNode) return

    let initialNode: DeptTreeNode | null = null
    const firstLeaderId = treeData.leader_dept_ids[0]
    if (firstLeaderId) {
      const leaderNode = findDepartmentNodeByValue(
        displayTreeData,
        firstLeaderId
      )
      if (leaderNode && !isDepartmentNodeDisabled(leaderNode)) {
        initialNode = leaderNode
      }
    }
    if (!initialNode) {
      initialNode = findFirstSelectableNode(displayTreeData)
    }
    if (!initialNode) return

    setSelectedNode(initialNode)
    setQueryParams(
      createDepartmentQueryParams(
        initialNode,
        dateRange.start ? Math.floor(dateRange.start.getTime() / 1000) : 0,
        dateRange.end ? Math.floor(dateRange.end.getTime() / 1000) : 0
      )
    )
  }, [displayTreeData, treeData, selectedNode, dateRange.start, dateRange.end])

  const handleDeptChange = (_deptId: string, node: DeptTreeNode) => {
    setSelectedNode(node)
    setQueryParams(null)
  }

  const handleSearch = () => {
    if (!selectedNode) return
    setQueryParams(
      createDepartmentQueryParams(
        selectedNode,
        dateRange.start ? Math.floor(dateRange.start.getTime() / 1000) : 0,
        dateRange.end ? Math.floor(dateRange.end.getTime() / 1000) : 0
      )
    )
  }

  let departmentSelector: ReactNode = null
  if (treeQuery.isLoading) {
    departmentSelector = <Skeleton className='h-8 w-[200px]' />
  } else if (treeData) {
    departmentSelector = (
      <DepartmentTreeSelect
        treeData={displayTreeData}
        value={selectedNode?.value}
        onValueChange={handleDeptChange}
        disabled={treeQuery.isFetching}
      />
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span>{t('Data Overview')}</span>
          {departmentSelector}
          <CompactDateTimeRangePicker
            start={dateRange.start}
            end={dateRange.end}
            onChange={setDateRange}
            className='max-w-[302px]'
          />
          {selectedNode && (
            <div className='ml-auto flex items-center gap-2'>
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
              <ExportDialog
                queryParams={queryParams}
                treeData={displayTreeData}
                stats={statsQuery.data?.data}
                subStats={subStatsQuery.data?.data ?? []}
              />
              <NotifySettingsDialog />
            </div>
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
              <div className='divide-border/60 grid min-w-0 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-5'>
                {STATS_SKELETON_KEYS.map((key) => (
                  <div
                    key={key}
                    className='min-w-0 px-3 py-2.5 sm:px-5 sm:py-4'
                  >
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

          {subStatsQuery.data?.data &&
            subStatsQuery.data.data.length > 0 &&
            queryParams && (
              <SubDepartmentStats
                data={subStatsQuery.data.data}
                companyId={queryParams.company_id}
                activityFormula={
                  statsQuery.data?.data.active_user_formula ?? [
                    10, 1_000_000, 0.85,
                  ]
                }
                startTimestamp={queryParams.start_timestamp}
                endTimestamp={queryParams.end_timestamp}
              />
            )}

          {queryParams && (
            <DepartmentUsersTable
              companyId={queryParams.company_id}
              departmentId={queryParams.department_id}
              startTimestamp={queryParams.start_timestamp}
              endTimestamp={queryParams.end_timestamp}
            />
          )}

          {usageQuery.isFetching && !usageQuery.data && (
            <Card className='mt-4'>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Skeleton className='size-5' />
                  <Skeleton className='h-4 w-24' />
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='grid grid-cols-1 lg:grid-cols-2'>
                  {USAGE_ANALYSIS_SKELETON_KEYS.map((key) => (
                    <div
                      key={key}
                      className='border-border/60 border-b lg:odd:border-r'
                    >
                      <div className='px-5 py-3'>
                        <Skeleton className='h-4 w-32' />
                      </div>
                      <div
                        className='flex items-center justify-center p-2'
                        style={{ height: 300 }}
                      >
                        <Loader2 className='text-muted-foreground size-6 animate-spin' />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {usageQuery.data?.data && (
            <UsageAnalysisSection data={usageQuery.data.data} />
          )}
        </FadeIn>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
