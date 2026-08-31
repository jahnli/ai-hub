import { describe, expect, it } from 'vitest'

import { calculateUnitPricePer100MTokens } from '../unit-price'

describe('calculateUnitPricePer100MTokens', () => {
  it('returns the cost of exactly 100M tokens', () => {
    expect(calculateUnitPricePer100MTokens(0.29, 100_000_000)).toBeCloseTo(0.29)
  })

  it('converts a former per-million price to the equivalent 100M-token price', () => {
    expect(calculateUnitPricePer100MTokens(0.29, 1_000_000)).toBeCloseTo(29)
  })

  it('returns zero when tokens cannot produce a valid unit price', () => {
    expect(calculateUnitPricePer100MTokens(0.29, 0)).toBe(0)
  })
})
