import type { CostBucket, ModelStat } from '../types'

export interface CostBucketDistributionItem {
  range: string
  users: number
  minAmountCny: number
  maxAmountCny: number
}

export interface CostBucketLabelTranslator {
  zeroSpend: string
  overMin: (min: number) => string
  between: (min: number, max: number) => string
}

/**
 * Formats a spend bucket into an axis label. A `max_amount_cny` of 0 marks the
 * open-ended top bucket, and a bucket where both bounds are 0 counts the people
 * who spent nothing at all.
 */
export function formatCostBucketRange(
  bucket: CostBucket,
  labels: CostBucketLabelTranslator
): string {
  if (bucket.max_amount_cny === 0) {
    if (bucket.min_amount_cny === 0) return labels.zeroSpend
    return labels.overMin(bucket.min_amount_cny)
  }
  return labels.between(bucket.min_amount_cny, bucket.max_amount_cny)
}

export function buildCostBucketDistributionData(
  buckets: CostBucket[],
  labels: CostBucketLabelTranslator
): { values: CostBucketDistributionItem[]; totalUsers: number } | null {
  if (buckets.length === 0) return null

  const values = buckets.map((bucket) => ({
    range: formatCostBucketRange(bucket, labels),
    users: bucket.users,
    minAmountCny: bucket.min_amount_cny,
    maxAmountCny: bucket.max_amount_cny,
  }))

  const totalUsers = values.reduce((sum, item) => sum + item.users, 0)
  if (totalUsers === 0) return null

  return { values, totalUsers }
}

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
