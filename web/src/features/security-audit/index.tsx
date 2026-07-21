/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { RotateCcw, Search, ShieldOff } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompactDateTimeRangePicker } from '@/features/usage-logs/components/compact-date-time-range-picker'
import dayjs from '@/lib/dayjs'

import { getSecurityAuditSetting } from './api'
import { getVisibleSecurityAuditSectionIds } from './audit-visibility'
import { ImageAuditTable } from './components/image-audit-table'
import { OffHoursTable } from './components/off-hours-table'
import {
  SECURITY_AUDIT_SECTION_IDS,
  isSecurityAuditSectionId,
  SECURITY_AUDIT_DEFAULT_SECTION,
  type SecurityAuditSectionId,
} from './section-registry'

const route = getRouteApi('/_authenticated/security-audit/$section')

const SECTION_META: Record<SecurityAuditSectionId, { titleKey: string }> = {
  'off-hours': {
    titleKey: 'Off-Hours Requests',
  },
  'image-studio': {
    titleKey: 'Image Audit',
  },
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function SecurityAudit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = route.useParams()
  const search = route.useSearch()
  const activeSection: SecurityAuditSectionId = isSecurityAuditSectionId(
    params.section
  )
    ? params.section
    : SECURITY_AUDIT_DEFAULT_SECTION
  const isOffHoursSection = activeSection === 'off-hours'

  const settingQuery = useQuery({
    queryKey: ['security-audit', 'setting'],
    queryFn: getSecurityAuditSetting,
    staleTime: 60 * 1000,
  })
  const auditSetting = settingQuery.data?.data
  const imageStudioEnabled = auditSetting?.image_studio !== false
  const offHoursEnabled = auditSetting?.off_hours.enabled !== false
  const visibleSectionIds = useMemo(
    () =>
      getVisibleSecurityAuditSectionIds(
        SECURITY_AUDIT_SECTION_IDS,
        offHoursEnabled,
        imageStudioEnabled
      ),
    [imageStudioEnabled, offHoursEnabled]
  )

  useEffect(() => {
    if (
      settingQuery.isLoading ||
      visibleSectionIds.includes(activeSection) ||
      visibleSectionIds.length === 0
    ) {
      return
    }
    void navigate({
      to: '/security-audit/$section',
      params: { section: visibleSectionIds[0] },
      search: (previousSearch: Record<string, unknown>) => previousSearch,
      replace: true,
    })
  }, [activeSection, navigate, settingQuery.isLoading, visibleSectionIds])

  const startTimestamp = search.startTime ?? dayjs().startOf('month').unix()
  const endTimestamp = search.endTime ?? dayjs().endOf('month').unix()

  const [startTimeInput, setStartTimeInput] = useState(
    () => new Date(startTimestamp * 1000)
  )
  const [endTimeInput, setEndTimeInput] = useState(
    () => new Date(endTimestamp * 1000)
  )
  const [usernameInput, setUsernameInput] = useState(search.username ?? '')

  const handleRangeChange = useCallback(
    (range: { start?: Date; end?: Date }) => {
      if (range.start) setStartTimeInput(range.start)
      if (range.end) setEndTimeInput(range.end)
    },
    []
  )

  const applyFilters = useCallback(() => {
    void navigate({
      to: '/security-audit/$section',
      params: { section: activeSection },
      search: (previousSearch: Record<string, unknown>) => ({
        ...previousSearch,
        startTime: dayjs(startTimeInput).unix(),
        endTime: dayjs(endTimeInput).unix(),
        username: usernameInput.trim() || undefined,
        page: 1,
      }),
    })
  }, [navigate, activeSection, startTimeInput, endTimeInput, usernameInput])

  const resetFilters = useCallback(() => {
    const defaultStartTime = dayjs().startOf('month')
    const defaultEndTime = dayjs().endOf('month')
    setStartTimeInput(defaultStartTime.toDate())
    setEndTimeInput(defaultEndTime.toDate())
    setUsernameInput('')
    void navigate({
      to: '/security-audit/$section',
      params: { section: activeSection },
      search: (previousSearch: Record<string, unknown>) => ({
        ...previousSearch,
        startTime: undefined,
        endTime: undefined,
        username: undefined,
        page: 1,
      }),
    })
  }, [navigate, activeSection])

  const handleSectionChange = useCallback(
    (section: string) => {
      void navigate({
        to: '/security-audit/$section',
        params: { section: section as SecurityAuditSectionId },
        // 跨 tab 保留时间与用户名筛选,仅重置页码
        search: (previousSearch: Record<string, unknown>) => ({
          ...previousSearch,
          page: 1,
        }),
      })
    },
    [navigate]
  )

  const noAuditEnabled =
    !settingQuery.isLoading && visibleSectionIds.length === 0

  let sectionContent: ReactNode = null
  if (noAuditEnabled) {
    sectionContent = (
      <EmptyState
        icon={ShieldOff}
        title={t('No security audits enabled')}
        description={t(
          'Enable at least one audit in System Settings → Security & Limits → Security Audit.'
        )}
        className='min-h-0 flex-1'
      />
    )
  } else if (isOffHoursSection) {
    if (!settingQuery.isLoading && offHoursEnabled) {
      sectionContent = (
        <div className='min-h-0 flex-1'>
          <OffHoursTable
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            username={search.username ?? ''}
            enabled
          />
        </div>
      )
    }
  } else if (!settingQuery.isLoading && imageStudioEnabled) {
    sectionContent = (
      <div className='min-h-0 flex-1'>
        <ImageAuditTable
          startTimestamp={startTimestamp}
          endTimestamp={endTimestamp}
          username={search.username ?? ''}
        />
      </div>
    )
  }

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Content>
        <div className='flex h-full min-h-0 flex-col gap-4'>
          {!noAuditEnabled && (
            <>
              <div className='flex flex-wrap items-center gap-2'>
                <Tabs value={activeSection} onValueChange={handleSectionChange}>
                  <TabsList className='max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto'>
                    {visibleSectionIds.map((section) => (
                      <TabsTrigger key={section} value={section}>
                        {t(SECTION_META[section].titleKey)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <CompactDateTimeRangePicker
                  start={startTimeInput}
                  end={endTimeInput}
                  onChange={handleRangeChange}
                  className='w-[320px] max-w-full'
                />
                <Input
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyFilters()
                  }}
                  placeholder={t('Search username')}
                  className='h-8 w-[180px]'
                />
                <Button type='button' variant='outline' onClick={resetFilters}>
                  <RotateCcw className='size-4' />
                  {t('Reset')}
                </Button>
                <Button type='button' onClick={applyFilters}>
                  <Search className='size-4' />
                  {t('Search')}
                </Button>
                {isOffHoursSection && auditSetting && (
                  <span className='text-muted-foreground ml-2 text-sm'>
                    {t('Audit window')}:{' '}
                    {formatHour(auditSetting.off_hours.start_hour)} -{' '}
                    {formatHour(auditSetting.off_hours.end_hour)}
                  </span>
                )}
              </div>
            </>
          )}
          {sectionContent}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
