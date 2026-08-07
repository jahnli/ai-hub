import type { ModelStat } from '../types'

export interface ModelCallDistributionItem {
  name: string
  value: number
  cost: number
  tokens: number
}

export interface ModelCostRankItem {
  name: string
  value: number
  tokens: number
  requests: number
}

export function buildModelCallDistributionData(
  stats: ModelStat[],
  quotaToCnyRate: number
): { values: ModelCallDistributionItem[]; totalRequests: number } | null {
  const values = stats
    .filter((item) => item.total_requests > 0)
    .map((item) => ({
      name: item.model_name,
      value: item.total_requests,
      cost: item.total_quota * quotaToCnyRate,
      tokens: item.total_tokens,
    }))

  if (values.length === 0) return null

  return {
    values,
    totalRequests: values.reduce((sum, item) => sum + item.value, 0),
  }
}

export function buildModelCostRankData(
  stats: ModelStat[],
  quotaToCnyRate: number,
  limit?: number
): ModelCostRankItem[] {
  const sorted = [...stats].sort((a, b) => {
    if (a.total_quota !== b.total_quota) {
      return b.total_quota - a.total_quota
    }
    return a.model_name.localeCompare(b.model_name)
  })

  const selected = limit && limit > 0 ? sorted.slice(0, limit) : sorted
  return selected.map((item) => ({
    name: item.model_name,
    value: item.total_quota * quotaToCnyRate,
    tokens: item.total_tokens,
    requests: item.total_requests,
  }))
}
