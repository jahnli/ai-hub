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

/** Mirrors backend model.OffHoursDayRow */
export interface OffHoursDayRow {
  date: string
  /** Audit window bounds (unix seconds, end exclusive) for detail drill-down */
  window_start: number
  window_end: number
  /** Earliest / latest request inside the window (unix seconds) */
  start_time: number
  end_time: number
  models: string[]
  ips: string[]
  count: number
  quota: number
}

/** Mirrors backend model.OffHoursUserRow */
export interface OffHoursUserRow {
  user_id: number
  username: string
  display_name: string
  avatar_url: string
  days: number
  models: string[]
  ips: string[]
  count: number
  quota: number
  day_rows: OffHoursDayRow[]
}

export interface GetOffHoursUsageParams {
  p?: number
  page_size?: number
  start_timestamp?: number
  end_timestamp?: number
  username?: string
}

export interface GetOffHoursUsageResponse {
  success: boolean
  message?: string
  data?: {
    items: OffHoursUserRow[] | null
    total: number
    page: number
    page_size: number
  }
}

export interface SecurityAuditSetting {
  enabled: boolean
  off_hours_start_hour: number
  off_hours_end_hour: number
}

export interface GetSecurityAuditSettingResponse {
  success: boolean
  message?: string
  data?: SecurityAuditSetting
}

/** Tree row rendered by the off-hours table: user rows expand into day rows. */
export interface AuditRow {
  id: string
  kind: 'user' | 'day'
  user: OffHoursUserRow
  day?: OffHoursDayRow
  children?: AuditRow[]
}

/** Target of the day-level detail dialog. */
export interface OffHoursDetailTarget {
  username: string
  displayName: string
  date: string
  windowStart: number
  windowEnd: number
}
