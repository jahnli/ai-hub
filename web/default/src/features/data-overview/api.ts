import { api } from '@/lib/api'
import type {
  DepartmentTreeResponse,
  DepartmentStat,
  SubDepartmentStat,
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
