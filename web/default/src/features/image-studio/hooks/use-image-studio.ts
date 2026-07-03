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
import { useCallback, useRef, useState } from 'react'

import { editImages, fetchGenerationLog, generateImages } from '../api'
import {
  CUSTOM_SIZE,
  DEFAULT_ESTIMATE_MS,
  ESTIMATE_SAMPLE_SIZE,
  MAX_IMAGE_COUNT,
} from '../constants'
import type {
  GeneratedImage,
  GenerationRecord,
  ImageGenerationPayload,
  ImageStudioConfig,
  ReferenceImage,
  StudioMode,
} from '../types'

function imageMimeTypeForOutputFormat(outputFormat: string): string {
  if (outputFormat === 'jpeg') return 'image/jpeg'
  if (outputFormat === 'webp') return 'image/webp'
  return 'image/png'
}

function resolveSize(config: ImageStudioConfig): string {
  if (config.size !== CUSTOM_SIZE) return config.size
  return `${config.customWidth}x${config.customHeight}`
}

function buildPayload(
  config: ImageStudioConfig,
  prompt: string,
  mode: StudioMode,
  referenceImages: ReferenceImage[]
): ImageGenerationPayload {
  const imageCount = Math.min(MAX_IMAGE_COUNT, Math.max(1, config.n))
  const payload: ImageGenerationPayload = {
    model: config.model,
    group: config.group,
    prompt,
    n: imageCount,
  }
  const size = resolveSize(config)
  if (size) payload.size = size
  payload.quality = config.quality
  payload.moderation = config.moderation
  payload.background = config.background
  payload.output_format = config.outputFormat
  if (config.outputCompression !== null) {
    payload.output_compression = config.outputCompression
  }
  // dall-e defaults to expiring URLs; request base64 so history stays valid
  if (config.model.startsWith('dall-e')) {
    payload.response_format = 'b64_json'
  }
  if (mode === 'edit') {
    payload.image = referenceImages.map((image) => image.dataUrl)
  }
  return payload
}

function extractApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as {
      response?: { data?: { error?: { message?: string }; message?: string } }
      message?: string
    }
    const apiMessage =
      maybeAxios.response?.data?.error?.message ??
      maybeAxios.response?.data?.message
    if (apiMessage) return apiMessage
    if (maybeAxios.message) return maybeAxios.message
  }
  return String(error)
}

export interface GenerateArgs {
  config: ImageStudioConfig
  prompt: string
  mode: StudioMode
  referenceImages: ReferenceImage[]
}

export function useImageGeneration({
  history,
  addRecord,
  patchRecord,
}: {
  history: GenerationRecord[]
  addRecord: (record: GenerationRecord) => void
  patchRecord: (id: string, patch: Partial<GenerationRecord>) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /** moving average of recent generation durations for the model */
  const estimateDurationMs = useCallback(
    (model: string): number => {
      const samples = history
        .filter((r) => r.model === model)
        .map((r) => r.usage?.durationMs ?? 0)
        .filter((duration) => duration > 0)
        .slice(0, ESTIMATE_SAMPLE_SIZE)
      if (samples.length === 0) return DEFAULT_ESTIMATE_MS
      return samples.reduce((sum, v) => sum + v, 0) / samples.length
    },
    [history]
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const generate = useCallback(
    async ({ config, prompt, mode, referenceImages }: GenerateArgs) => {
      const payload = buildPayload(config, prompt, mode, referenceImages)
      const controller = new AbortController()
      abortRef.current = controller
      setIsGenerating(true)
      setGenerationError(null)

      const startedAt = Date.now()
      try {
        const send = mode === 'edit' ? editImages : generateImages
        const { response, requestId } = await send(payload, controller.signal)
        const durationMs = Date.now() - startedAt

        const imageMimeType = imageMimeTypeForOutputFormat(config.outputFormat)
        const images: GeneratedImage[] = (response.data ?? []).map(
          (item, index) => ({
            id: `${startedAt}-${index}`,
            src: item.b64_json
              ? `data:${imageMimeType};base64,${item.b64_json}`
              : (item.url ?? ''),
            revisedPrompt: item.revised_prompt,
          })
        )

        if (images.every((image) => !image.src)) {
          throw new Error('empty image response')
        }

        const record: GenerationRecord = {
          id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: startedAt,
          mode,
          prompt,
          model: config.model,
          group: config.group,
          size: resolveSize(config),
          quality: config.quality,
          moderation: config.moderation,
          outputFormat: config.outputFormat,
          n: payload.n ?? 1,
          images,
          referenceImages: mode === 'edit' ? referenceImages : undefined,
          usage: { durationMs },
        }
        addRecord(record)
        setActiveRecordId(record.id)

        // billing info lands in logs slightly after the response
        window.setTimeout(() => {
          void fetchGenerationLog(requestId, config.model).then((log) => {
            if (!log) return
            patchRecord(record.id, {
              usage: {
                durationMs,
                quota: log.quota,
                promptTokens: log.promptTokens,
                completionTokens: log.completionTokens,
              },
            })
          })
        }, 1200)
        return record
      } catch (error) {
        if (controller.signal.aborted) return null
        setGenerationError(extractApiErrorMessage(error))
        return null
      } finally {
        abortRef.current = null
        setIsGenerating(false)
      }
    },
    [addRecord, patchRecord]
  )

  return {
    isGenerating,
    generationError,
    setGenerationError,
    activeRecordId,
    setActiveRecordId,
    estimateDurationMs,
    generate,
    stopGeneration,
  }
}
