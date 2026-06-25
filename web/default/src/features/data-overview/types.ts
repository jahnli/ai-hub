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

export interface DepartmentStat {
  total_tokens: number
  total_quota: number
  total_requests: number
  total_errors: number
  total_use_time: number
  avg_use_time: number
  error_rate: number
  avg_price_per_mt: number
}
