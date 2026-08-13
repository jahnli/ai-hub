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
import { CUSTOM_SIZE } from '../../constants'
import type {
  ImageGenerationPayload,
  ImageStudioConfig,
  ReferenceImage,
  StudioMode,
} from '../../types'
import { GPT_IMAGE_PARAMETERS } from './gpt-image/config'
import { SEEDREAM_PARAMETERS, isSeedreamModel } from './seedream/config'

export interface ImageModelRuntimeLimits {
  maxImages: number
  maxReferenceImages: number
  maxTotalImages: number | null
  usesGenerationEndpointForEdits: boolean
}

export function getImageModelRuntimeLimits(
  model: string
): ImageModelRuntimeLimits {
  if (isSeedreamModel(model)) {
    return {
      maxImages: SEEDREAM_PARAMETERS.maxImages,
      maxReferenceImages: SEEDREAM_PARAMETERS.maxReferenceImages,
      maxTotalImages: SEEDREAM_PARAMETERS.maxTotalImages,
      usesGenerationEndpointForEdits: true,
    }
  }
  return {
    maxImages: GPT_IMAGE_PARAMETERS.maxImages,
    maxReferenceImages: GPT_IMAGE_PARAMETERS.maxReferenceImages,
    maxTotalImages: null,
    usesGenerationEndpointForEdits: false,
  }
}

export function normalizeConfigForModel(
  config: ImageStudioConfig
): ImageStudioConfig {
  return isSeedreamModel(config.model)
    ? SEEDREAM_PARAMETERS.normalizeConfig(config)
    : GPT_IMAGE_PARAMETERS.normalizeConfig(config)
}

export function isCustomSizeValid(config: ImageStudioConfig): boolean {
  return isSeedreamModel(config.model)
    ? SEEDREAM_PARAMETERS.isCustomSizeValid(config)
    : GPT_IMAGE_PARAMETERS.isCustomSizeValid(config)
}

function resolveSize(config: ImageStudioConfig): string {
  if (config.size !== CUSTOM_SIZE) return config.size
  return `${config.customWidth}x${config.customHeight}`
}

export function buildImageGenerationPayload(
  config: ImageStudioConfig,
  prompt: string,
  mode: StudioMode,
  referenceImages: ReferenceImage[]
): ImageGenerationPayload {
  const modelPayload = isSeedreamModel(config.model)
    ? SEEDREAM_PARAMETERS.buildPayload(config)
    : GPT_IMAGE_PARAMETERS.buildPayload(config, mode)
  const payload: ImageGenerationPayload = {
    model: config.model,
    group: config.group,
    prompt,
    ...modelPayload,
  }
  const size = resolveSize(config)
  if (size && size !== 'auto') payload.size = size
  if (mode === 'edit') {
    payload.image = referenceImages.map((image) => image.dataUrl)
  }
  return payload
}
