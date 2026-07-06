import { api } from '@/lib/api'
import type { GetLogsParams, GetLogsResponse } from '@/features/usage-logs/types'
import type {
  DepartmentTreeResponse,
  DepartmentStat,
  SubDepartmentStat,
  UsageAnalysis,
  ReportNotifySetting,
  DepartmentUsersResponse,
  UserRankingItem,
} from './types'

export async function getDepartmentTree(): Promise<{
  success: boolean
  data: DepartmentTreeResponse
}> {
  const res = await api.get<{ success: boolean; data: DepartmentTreeResponse }>(
    '/api/department/tree'
  )
  return res.data
}

export async function getDepartmentStats(params: {
  department_id: string
  start_timestamp: number
  end_timestamp: number
}): Promise<{ success: boolean; data: DepartmentStat }> {
  const res = await api.post<{ success: boolean; data: DepartmentStat }>(
    '/api/department/stats',
    params
  )
  return res.data
}

export async function getSubDepartmentStats(params: {
  department_id: string
  start_timestamp: number
  end_timestamp: number
}): Promise<{ success: boolean; data: SubDepartmentStat[] }> {
  const res = await api.post<{
    success: boolean
    data: SubDepartmentStat[]
  }>('/api/department/sub-stats', params)
  return res.data
}

export async function getUsageAnalysis(params: {
  department_id: string
  start_timestamp: number
  end_timestamp: number
}): Promise<{ success: boolean; data: UsageAnalysis }> {
  const res = await api.post<{
    success: boolean
    data: UsageAnalysis
  }>('/api/department/usage-analysis', params)
  return res.data
}

export async function getDepartmentLogs(
  params: GetLogsParams & { department_id: string }
): Promise<GetLogsResponse> {
  const res = await api.post<GetLogsResponse>('/api/department/logs', params)
  return res.data
}

export async function getReportNotifySetting(): Promise<{
  success: boolean
  data: ReportNotifySetting
}> {
  const res = await api.get<{
    success: boolean
    data: ReportNotifySetting
  }>('/api/report-notify-setting/self')
  return res.data
}

export async function updateReportNotifySetting(
  params: ReportNotifySetting
): Promise<{ success: boolean; message: string }> {
  const res = await api.put<{ success: boolean; message: string }>(
    '/api/report-notify-setting/self',
    params
  )
  return res.data
}

export async function getDepartmentUsers(params: {
  department_id: string
  start_timestamp: number
  end_timestamp: number
  page: number
  page_size: number
  sort_by?: string
  sort_order?: string
  registration_status?: string
  include_unregistered?: boolean
}): Promise<{ success: boolean; data: DepartmentUsersResponse }> {
  const res = await api.post<{
    success: boolean
    data: DepartmentUsersResponse
  }>('/api/department/users', params)
  return res.data
}

export async function getDepartmentUserRankings(params: {
  department_id: string
  start_timestamp: number
  end_timestamp: number
}): Promise<{ success: boolean; data: UserRankingItem[] }> {
  const res = await api.post<{
    success: boolean
    data: UserRankingItem[]
  }>('/api/department/user-rankings', params)
  return res.data
}

export async function getUserUsageAnalysis(params: {
  user_id: number
  start_timestamp: number
  end_timestamp: number
}): Promise<{ success: boolean; data: UsageAnalysis }> {
  const res = await api.post<{
    success: boolean
    data: UsageAnalysis
  }>('/api/department/user-usage-analysis', params)
  return res.data
}
