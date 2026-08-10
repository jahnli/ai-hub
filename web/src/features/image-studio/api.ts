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
import { api } from '@/lib/api'

import { API_ENDPOINTS, DEFAULT_HISTORY_DISPLAY_LIMIT } from './constants'
import type {
  GroupOption,
  ImageApiResponse,
  ImageGenerationPayload,
  ImageStudioGenerationRecord,
  ModelOption,
  StoreImageStudioGenerationPayload,
} from './types'

export interface ImageRequestResult {
  response: ImageApiResponse
  requestId: string
}

async function postImageRequest(
  endpoint: string,
  payload: ImageGenerationPayload,
  signal?: AbortSignal
): Promise<ImageRequestResult> {
  const res = await api.post(endpoint, payload, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return {
    response: res.data as ImageApiResponse,
    requestId: String(res.headers?.['x-oneapi-request-id'] ?? ''),
  }
}

export function generateImages(
  payload: ImageGenerationPayload,
  signal?: AbortSignal
): Promise<ImageRequestResult> {
  return postImageRequest(API_ENDPOINTS.IMAGE_GENERATIONS, payload, signal)
}

export function editImages(
  payload: ImageGenerationPayload,
  signal?: AbortSignal
): Promise<ImageRequestResult> {
  return postImageRequest(API_ENDPOINTS.IMAGE_EDITS, payload, signal)
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

function unwrapApiData<T>(data: ApiEnvelope<T>, message: string): T {
  if (!data.success || data.data === undefined) {
    throw new Error(data.message || message)
  }
  return data.data
}

export async function storeImageStudioGeneration(
  payload: StoreImageStudioGenerationPayload,
  signal?: AbortSignal
): Promise<ImageStudioGenerationRecord> {
  const res = await api.post(API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS, payload, {
    signal,
  })
  return unwrapApiData(
    res.data as ApiEnvelope<ImageStudioGenerationRecord>,
    'failed to store generated images'
  )
}

export interface ImageStudioGenerationListResult {
  records: ImageStudioGenerationRecord[]
  displayLimit: number
}

export async function listImageStudioGenerations(): Promise<ImageStudioGenerationListResult> {
  const res = await api.get(API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS)
  const { data } = res
  const headerLimit = Number.parseInt(
    String(res.headers?.['x-image-studio-display-history-limit'] ?? ''),
    10
  )
  const displayLimit =
    Number.isInteger(headerLimit) && headerLimit > 0
      ? Math.min(1000, headerLimit)
      : DEFAULT_HISTORY_DISPLAY_LIMIT
  if (!data.success || !Array.isArray(data.data)) {
    return { records: [], displayLimit }
  }
  return {
    records: data.data as ImageStudioGenerationRecord[],
    displayLimit,
  }
}

export async function deleteImageStudioGeneration(id: string): Promise<void> {
  await api.delete(`${API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS}/${id}`)
}

export async function clearImageStudioGenerations(): Promise<void> {
  await api.delete(API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS)
}

export async function updateImageStudioGenerationFavorite(
  id: string,
  favorite: boolean
): Promise<void> {
  await api.patch(`${API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS}/${id}/favorite`, {
    favorite,
  })
}

export async function updateImageStudioGenerationUsage(
  id: string,
  usage: {
    quota?: number
    promptTokens?: number
    completionTokens?: number
    channelId?: number
  }
): Promise<void> {
  await api.patch(`${API_ENDPOINTS.IMAGE_STUDIO_GENERATIONS}/${id}/usage`, {
    quota: usage.quota ?? 0,
    prompt_tokens: usage.promptTokens ?? 0,
    completion_tokens: usage.completionTokens ?? 0,
    channel_id: usage.channelId ?? 0,
  })
}

export async function getUserModels(group: string): Promise<ModelOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_MODELS, {
    params: { group },
  })
  const { data } = res

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  return data.data.map((model: string) => ({
    label: model,
    value: model,
  }))
}

export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_GROUPS)
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}

export interface GenerationLogInfo {
  quota: number
  promptTokens: number
  completionTokens: number
  useTimeSeconds: number
  channelId: number
}

/**
 * Fetch billing info of a finished generation from the user's own logs.
 * Matched by request id when available, otherwise falls back to the
 * latest consume log of the model.
 */
export async function fetchGenerationLog(
  requestId: string,
  modelName: string
): Promise<GenerationLogInfo | null> {
  try {
    const params: Record<string, unknown> = {
      p: 1,
      page_size: 1,
      type: 2, // consume logs
    }
    if (requestId) {
      params.request_id = requestId
    } else if (modelName) {
      params.model_name = modelName
    }
    const res = await api.get('/api/log/self', { params })
    const { data } = res
    if (!data.success) return null
    const items = data.data?.items
    if (!Array.isArray(items) || items.length === 0) return null
    const log = items[0]
    return {
      quota: Number(log.quota ?? 0),
      promptTokens: Number(log.prompt_tokens ?? 0),
      completionTokens: Number(log.completion_tokens ?? 0),
      useTimeSeconds: Number(log.use_time ?? 0),
      channelId: Number(log.channel ?? 0),
    }
  } catch {
    return null
  }
}
