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

export const companyPlatformSchema = z.enum(['none', 'feishu', 'dingtalk'])
export type CompanyPlatform = z.infer<typeof companyPlatformSchema>

export const companyStatusSchema = z.enum(['enabled', 'disabled'])
export type CompanyStatus = z.infer<typeof companyStatusSchema>

export const companyLoginMethodSchema = z.enum(['password', 'ldap', 'platform'])
export type CompanyLoginMethod = z.infer<typeof companyLoginMethodSchema>

export const companyCredentialsSchema = z.object({
  app_id: z.string().optional(),
  client_id: z.string().optional(),
  app_secret_configured: z.boolean().optional().default(false),
  client_secret_configured: z.boolean().optional().default(false),
})
export type CompanyCredentials = z.infer<typeof companyCredentialsSchema>

export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  alias: z.string(),
  platform: companyPlatformSchema,
  status: companyStatusSchema,
  sort_order: z.number(),
  login_methods: z.array(companyLoginMethodSchema),
  platform_credentials: companyCredentialsSchema.optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Company = z.infer<typeof companySchema>

export type ApiResponse<T = unknown> = {
  success: boolean
  message?: string
  data?: T
}
