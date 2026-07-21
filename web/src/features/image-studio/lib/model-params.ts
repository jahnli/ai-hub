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
import {
  CUSTOM_SIZE,
  GPT_IMAGE_2_BACKGROUND_OPTIONS,
  GPT_IMAGE_QUALITY_OPTIONS,
  MAX_IMAGE_COUNT,
  SIZE_PRESETS,
} from '../constants'
import type { ImageStudioConfig } from '../types'

/**
 * Parameter support of an image model, following the OpenAI Images API
 * reference. The studio currently only ships gpt-image-2; the table is
 * the single extension point for bringing other model families online
 * (payload building, config normalization and the params panel all
 * render from it).
 */
export interface ImageModelParamSupport {
  sizePresets: readonly string[]
  supportsAutoSize: boolean
  supportsCustomSize: boolean
  /** null hides the quality picker; 'auto' means "use provider default" */
  qualityOptions: readonly string[] | null
  /** OpenAI generations-only param */
  supportsModeration: boolean
  backgroundOptions: readonly string[] | null
  supportsOutputFormat: boolean
  /** set to force a response_format (e.g. 'b64_json' for url-only providers) */
  responseFormat?: string
  maxImages: number
}

const GPT_IMAGE_2_SUPPORT: ImageModelParamSupport = {
  sizePresets: SIZE_PRESETS,
  supportsAutoSize: true,
  supportsCustomSize: true,
  qualityOptions: GPT_IMAGE_QUALITY_OPTIONS,
  supportsModeration: true,
  backgroundOptions: GPT_IMAGE_2_BACKGROUND_OPTIONS,
  supportsOutputFormat: true,
  maxImages: MAX_IMAGE_COUNT,
}

export function imageModelParamSupport(model: string): ImageModelParamSupport {
  // add per-family branches on the lowercased model name here when more
  // models come online (dall-e, seedream, flux, ...)
  void model
  return GPT_IMAGE_2_SUPPORT
}

/** Reset config fields that the newly selected model does not support. */
export function normalizeConfigForModel(
  config: ImageStudioConfig
): ImageStudioConfig {
  const support = imageModelParamSupport(config.model)
  const next = { ...config }

  const sizeInvalid =
    (next.size === 'auto' && !support.supportsAutoSize) ||
    (next.size === CUSTOM_SIZE && !support.supportsCustomSize) ||
    (next.size !== 'auto' &&
      next.size !== CUSTOM_SIZE &&
      !support.sizePresets.includes(next.size))
  if (sizeInvalid) {
    next.size = support.supportsAutoSize
      ? 'auto'
      : support.sizePresets.includes('1024x1024')
        ? '1024x1024'
        : support.sizePresets[0]
  }

  if (
    support.qualityOptions === null ||
    !support.qualityOptions.includes(next.quality)
  ) {
    next.quality = 'auto'
  }
  if (
    support.backgroundOptions === null ||
    !support.backgroundOptions.includes(next.background)
  ) {
    next.background = 'auto'
  }
  if (!support.supportsModeration) {
    next.moderation = 'auto'
  }
  next.n = Math.min(next.n, support.maxImages)
  return next
}
