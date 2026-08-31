import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, test } from 'vitest'

import type { PricingModel } from '../../types'
import { PriceSection } from '../model-details-price'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

const tokenModel: PricingModel = {
  id: 1,
  model_name: 'group-priced-token-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 2,
  enable_groups: ['default', 'vip'],
  group_ratio: { default: 0.5, vip: 3 },
}

function renderPriceSection(
  model: PricingModel,
  options: { selectedGroup?: string; currentUserGroup?: string }
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <PriceSection
        model={model}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit='M'
        showRechargePrice={false}
        selectedGroup={options.selectedGroup}
        currentUserGroup={options.currentUserGroup}
      />
    </I18nextProvider>
  )
}

describe('model details base price group', () => {
  test('uses the actively selected group instead of the raw base ratio', () => {
    const html = renderPriceSection(tokenModel, {
      selectedGroup: 'vip',
      currentUserGroup: 'default',
    })

    expect(html).toContain('$6')
    expect(html).toContain('$12')
    expect(html).not.toContain('$2<')
  })

  test('uses the current user group when all groups are selected', () => {
    const requestModel: PricingModel = {
      ...tokenModel,
      id: 2,
      model_name: 'group-priced-request-model',
      quota_type: 1,
      model_price: 10,
    }

    const html = renderPriceSection(requestModel, {
      selectedGroup: 'all',
      currentUserGroup: 'default',
    })

    expect(html).toContain('$5')
    expect(html).not.toContain('$10')
  })

  test('applies the selected group ratio to dynamic pricing', () => {
    const dynamicModel: PricingModel = {
      ...tokenModel,
      id: 3,
      model_name: 'group-priced-dynamic-model',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 2 + c * 8)',
    }

    const html = renderPriceSection(dynamicModel, {
      selectedGroup: 'vip',
      currentUserGroup: 'default',
    })

    expect(html).toContain('$6')
    expect(html).toContain('$24')
  })

  test('shows task usage prices with their declared unit and group ratio', () => {
    const taskModel: PricingModel = {
      ...tokenModel,
      id: 4,
      model_name: 'group-priced-task-model',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", u("seconds") * 0.4)',
      billing_usage_schema: {
        seconds: { type: 'number', unit: 'second' },
      },
    }

    const html = renderPriceSection(taskModel, {
      selectedGroup: 'vip',
      currentUserGroup: 'default',
    })

    expect(html).toContain('$1.2')
    expect(html).toContain('/ s')
    expect(html).not.toContain('/ 1M')
  })

  test('shows an explicit unconfigured state for task usage pricing', () => {
    const taskModel: PricingModel = {
      ...tokenModel,
      id: 5,
      model_name: 'unconfigured-task-model',
      billing_usage_schema: {
        seconds: { type: 'number', unit: 'second' },
      },
    }

    const html = renderPriceSection(taskModel, {
      currentUserGroup: 'default',
    })

    expect(html).toContain('Usage-based billing · price not configured')
    expect(html).not.toContain('/ 1M')
  })
})
