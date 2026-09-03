import { api } from '@/lib/api'

import { decryptPricingPayload } from './lib/pricing-encryption'
import type { PricingData } from './types'

// ----------------------------------------------------------------------------
// Pricing APIs
// ----------------------------------------------------------------------------

// Get model pricing data
export async function getPricing(): Promise<PricingData> {
  const res = await api.get<string>('/api/pricing', {
    responseType: 'text',
  })
  return decryptPricingPayload(res.data, __MODEL_SQUARE_AES_KEY__)
}
