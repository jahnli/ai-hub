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
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import {
  generateTaskExprFromConfig,
  tryParseTaskVisualConfig,
} from '@/features/pricing/lib/task-expr'
import type { BillingUsageSchema } from '@/features/pricing/types'

import { TaskUsagePricingEditor } from '../task-usage-pricing-editor'

const secondsSchema: BillingUsageSchema = {
  seconds: { type: 'number', unit: 'second' },
}

describe('task usage pricing local currency', () => {
  test('shows a converted unit price and writes the edited value back as USD', () => {
    const onBillingExprChange = vi.fn()
    const expression = generateTaskExprFromConfig(
      {
        tiers: [
          {
            label: 'base',
            conditions: [],
            constant: 0,
            unitPrices: { seconds: 0.4 },
          },
        ],
      },
      secondsSchema
    )

    render(
      <TaskUsagePricingEditor
        billingExpr={expression}
        requestRuleExpr=''
        usageSchema={secondsSchema}
        currencySymbol='¥'
        exchangeRate={7}
        onBillingExprChange={onBillingExprChange}
        onRequestRuleExprChange={() => undefined}
      />
    )

    const priceInput = screen.getByRole('spinbutton', {
      name: 'seconds: Price',
    })
    expect(priceInput).toHaveValue(2.8)
    expect(screen.getByText(/¥2\.8\/second/)).toBeInTheDocument()

    fireEvent.change(priceInput, { target: { value: '7' } })

    const savedExpression = onBillingExprChange.mock.lastCall?.[0]
    const parsed = tryParseTaskVisualConfig(
      String(savedExpression),
      secondsSchema
    )
    expect(parsed?.tiers[0]?.unitPrices.seconds).toBe(1)
  })

  test('converts enum matrix cells without changing the USD expression contract', () => {
    const usageSchema: BillingUsageSchema = {
      mode: { enum: ['std', 'pro'] },
      seconds: { type: 'number', unit: 'second' },
    }
    const expression = generateTaskExprFromConfig(
      {
        tiers: [
          {
            label: 'pro',
            conditions: [{ field: 'mode', value: 'pro' }],
            constant: 0,
            unitPrices: { seconds: 0.8 },
          },
          {
            label: 'std',
            conditions: [],
            constant: 0,
            unitPrices: { seconds: 0.4 },
          },
        ],
      },
      usageSchema
    )
    const onBillingExprChange = vi.fn()

    render(
      <TaskUsagePricingEditor
        billingExpr={expression}
        requestRuleExpr=''
        usageSchema={usageSchema}
        currencySymbol='¥'
        exchangeRate={7}
        onBillingExprChange={onBillingExprChange}
        onRequestRuleExprChange={() => undefined}
      />
    )

    const standardPriceInput = screen.getByRole('spinbutton', {
      name: 'seconds: std',
    })
    expect(standardPriceInput).toHaveValue(2.8)

    fireEvent.change(standardPriceInput, { target: { value: '7' } })

    const savedExpression = onBillingExprChange.mock.lastCall?.[0]
    const parsed = tryParseTaskVisualConfig(
      String(savedExpression),
      usageSchema
    )
    const standardTier = parsed?.tiers.find((tier) =>
      tier.conditions.some(
        (condition) => condition.field === 'mode' && condition.value === 'std'
      )
    )
    expect(standardTier?.unitPrices.seconds).toBe(1)
  })
})
