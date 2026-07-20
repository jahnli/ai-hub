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
import { z } from 'zod'

import type { AdminPermissionMatrix } from '@/lib/admin-permissions'

// ============================================================================
// User Schema & Types
// ============================================================================

/** User status: 1 = enabled, 2 = disabled, 3+ = other states */
export const userStatusSchema = z.number()
export type UserStatus = z.infer<typeof userStatusSchema>

/** User role: 1 = common user, 2 = AI BP, 3 = Center BP, 10 = admin, 100 = root */
export const userRoleSchema = z.number()
export type UserRole = z.infer<typeof userRoleSchema>

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  display_name: z.string(),
  password: z.string().optional(),
  oidc_id: z.string().optional(),
  wechat_id: z.string().optional(),
  email: z.string().optional(),
  quota: z.number(),
  used_quota: z.number(),
  sub_quota_used: z.number().optional().default(0),
  sub_quota_total: z.number().optional().default(0),
  monthly_total_amount_cny: z.number().optional().default(0),
  monthly_total_tokens: z.number().optional().default(0),
  monthly_total_requests: z.number().optional().default(0),
  monthly_common_model: z.string().optional(),
  request_count: z.number(),
  group: z.string(),
  status: userStatusSchema,
  role: userRoleSchema,
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
  last_login_at: z.number().optional(),
  DeletedAt: z.any().nullable().optional(),
  remark: z.string().optional(),
  avatar_url: z.string().optional(),
  department_name: z.string().optional(),
  job_title: z.string().optional(),
  job_number: z.string().optional(),
  mobile: z.string().optional(),
  open_id: z.string().optional(),
  gender: z.number().optional(),
  description: z.string().optional(),
  background_image: z.string().optional(),
  custom_field_values: z.string().optional(),
  join_date: z.string().optional(),
  company: z.string().optional(),
  admin_permissions: z
    .record(z.string(), z.record(z.string(), z.boolean()))
    .optional(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Generic API response */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export type UserSortBy =
  | 'id'
  | 'username'
  | 'quota'
  | 'group'
  | 'created_at'
  | 'last_login_at'
  | 'used_quota'
  | 'role'
  | 'status'
  | 'sub_quota_used'
  | 'monthly_total_amount_cny'
  | 'monthly_avg_price_per_mt'
  | 'monthly_total_tokens'
  | 'monthly_total_requests'

export type UserSortOrder = 'asc' | 'desc'

export interface GetUsersParams {
  p?: number
  page_size?: number
  sort_by?: UserSortBy
  sort_order?: UserSortOrder
}

export interface GetUsersResponse {
  success: boolean
  message?: string
  data?: {
    items: User[]
    total: number
    page: number
    page_size: number
  }
}

export interface SearchUsersParams {
  keyword?: string
  group?: string
  company?: string
  role?: string
  status?: string
  p?: number
  page_size?: number
  sort_by?: UserSortBy
  sort_order?: UserSortOrder
}

export interface UserFormData {
  username: string
  display_name: string
  password?: string
  role?: number // Only used when creating user
  quota?: number // Only used when updating user
  group?: string // Only used when updating user
  remark?: string // Only used when updating user
  admin_permissions?: AdminPermissionMatrix
}

export type ManageUserAction =
  | 'promote'
  | 'demote'
  | 'enable'
  | 'disable'
  | 'add_quota'

export type QuotaAdjustMode = 'add' | 'subtract' | 'override'

export interface ManageUserQuotaPayload {
  id: number
  action: 'add_quota'
  mode: QuotaAdjustMode
  value: number
}

// ============================================================================
// Dialog Types
// ============================================================================

export type UsersDialogType = 'create' | 'update'

// ============================================================================
// Shared Column Row Interface
// ============================================================================

export interface UserColumnRow {
  id: number
  username: string
  display_name: string
  email?: string
  avatar_url?: string
  remark?: string
  quota: number
  used_quota: number
  sub_quota_used: number
  sub_quota_total: number
  request_count: number
  group: string
  status: number
  role: number
  created_at?: number
  last_login_at?: number
  DeletedAt?: unknown | null
  department_name?: string
  custom_field_values?: string
  join_date?: string
  job_number?: string
  job_title?: string
  description?: string
  background_image?: string
  mobile?: string
  open_id?: string
  gender?: number
  company?: string
}

// ============================================================================
// Custom Field Helpers
// ============================================================================

export const CUSTOM_FIELD_KEYS = {
  JOB_LEVEL: 'C-7434714811573665793',
  JOB_DESCRIPTION: 'C-7439269744984244227',
  BIRTHDAY: 'C-7613945054108945361',
  HOMETOWN: 'C-7439630416690561028',
  ETHNICITY: 'C-7439269636549230620',
} as const

export function parseCustomFields(
  raw?: string
): Record<string, string> | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, string>
    }
  } catch {
    // ignore
  }
  return undefined
}
