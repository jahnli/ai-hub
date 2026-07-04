export interface DeptTreeNode {
  value: string
  label: string
  disabled: boolean
  children: DeptTreeNode[]
}

export interface TenantInfo {
  name: string
  tenant_key: string
}

export interface DepartmentTreeResponse {
  tree_data: DeptTreeNode[]
  leader_dept_ids: string[]
  tenant_info: TenantInfo | null
}

export interface SubDepartmentStat {
  department_id: string
  department_name: string
  registered_users: number
  total_users: number
  total_quota: number
  total_amount_cny: number
  total_tokens: number
  total_requests: number
}

export interface ModelStat {
  model_name: string
  total_tokens: number
  total_quota: number
  total_requests: number
}

export interface DailyStat {
  date: string
  total_tokens: number
  total_quota: number
  total_requests: number
}

export interface ModelDailyStat {
  date: string
  model_name: string
  total_tokens: number
}

export interface UsageAnalysis {
  model_stats: ModelStat[]
  daily_stats: DailyStat[]
  model_daily_stats: ModelDailyStat[]
  quota_to_cny: number
}

export interface DepartmentStat {
  total_tokens: number
  total_quota: number
  total_amount_cny: number
  total_requests: number
  total_errors: number
  total_use_time: number
  avg_use_time: number
  error_rate: number
  avg_price_per_mt: number
  registered_users: number
  unregistered_users: number
}

export interface ReportNotifySetting {
  frequency: number
  quota: number
  quota_leave: number
}

export interface DepartmentUser {
  id: number
  username: string
  display_name: string
  email?: string
  quota: number
  used_quota: number
  sub_quota_used: number
  sub_quota_total: number
  total_amount_cny: number
  total_tokens: number
  total_requests: number
  is_registered?: boolean
  common_model?: string
  request_count: number
  group: string
  status: number
  role: number
  created_at?: number
  last_login_at?: number
  DeletedAt?: unknown | null
  remark?: string
  avatar_url?: string
  department_name?: string
  job_title?: string
  job_number?: string
  mobile?: string
  gender?: number
  description?: string
  background_image?: string
  custom_field_values?: string
  join_date?: string
  open_id?: string
}

export interface DepartmentUsersResponse {
  items: DepartmentUser[]
  total: number
  page: number
  page_size: number
  total_users: number
  registered_users: number
  unregistered_users: number
}

export interface UserRankingItem {
  username: string
  display_name: string
  total_cost: number
  total_tokens: number
}
