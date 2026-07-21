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
import { api } from '@/lib/api'

import type {
  GetImageAuditParams,
  GetImageAuditResponse,
  GetOffHoursUsageParams,
  GetOffHoursUsageResponse,
  GetSecurityAuditSettingResponse,
} from './types'

export async function getSecurityAuditSetting(): Promise<GetSecurityAuditSettingResponse> {
  const res = await api.get('/api/security_audit/setting')
  return res.data
}

export async function getOffHoursUsage(
  params: GetOffHoursUsageParams
): Promise<GetOffHoursUsageResponse> {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })
  const res = await api.get(`/api/security_audit/off_hours?${queryParams}`)
  return res.data
}

export async function getImageAudit(
  params: GetImageAuditParams
): Promise<GetImageAuditResponse> {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })
  const res = await api.get(`/api/security_audit/image_studio?${queryParams}`)
  return res.data
}
