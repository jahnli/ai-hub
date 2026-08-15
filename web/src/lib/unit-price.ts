const TOKENS_PER_HUNDRED_MILLION = 100_000_000

export function calculateUnitPricePer100MTokens(
  cost: number,
  tokens: number
): number {
  if (
    !Number.isFinite(cost) ||
    !Number.isFinite(tokens) ||
    cost <= 0 ||
    tokens <= 0
  ) {
    return 0
  }

  return (cost / tokens) * TOKENS_PER_HUNDRED_MILLION
}
