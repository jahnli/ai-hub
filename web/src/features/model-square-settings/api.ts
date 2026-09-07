import { api } from '@/lib/api'

import type { ModelSquareConfig, ModelSquareConfigData } from './types'

export const modelSquareConfigQueryKey = ['model-square', 'config'] as const

export async function getModelSquareConfig(): Promise<ModelSquareConfigData> {
  const response = await api.get<
    ModelSquareConfigData & { success: boolean; message?: string }
  >('/api/model-square/config', {
    skipBusinessError: true,
    skipErrorHandler: true,
  })
  if (!response.data.success) {
    throw new Error(
      response.data.message || 'Failed to load model square settings'
    )
  }
  return { data: response.data.data, models: response.data.models ?? [] }
}

export async function saveModelSquareConfig(
  config: ModelSquareConfig
): Promise<ModelSquareConfig> {
  const response = await api.put<{
    success: boolean
    message?: string
    data: ModelSquareConfig
  }>('/api/model-square/config', config, {
    skipBusinessError: true,
    skipErrorHandler: true,
  })
  if (!response.data.success) {
    throw new Error(
      response.data.message || 'Failed to save model square settings'
    )
  }
  return response.data.data
}
