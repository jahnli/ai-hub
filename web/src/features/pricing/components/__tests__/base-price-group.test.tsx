// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { describe, expect, test } from 'bun:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

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
})
