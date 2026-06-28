import { api } from '@/lib/api'
import type {
  DepartmentTreeResponse,
  DepartmentStat,
  SubDepartmentStat,
  UsageAnalysis,
  ReportNotifySetting,
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
