import { CUSTOM_SIZE } from '../../constants'
import type {
  GenerationRecord,
  ImageGenerationPayload,
  ImageStudioConfig,
  ImageStudioParameters,
  ReferenceImage,
  StudioMode,
} from '../../types'
import {
  DEFAULT_GPT_IMAGE_PARAMETERS,
  GPT_IMAGE_PARAMETERS,
  isGptImageModel,
} from './gpt-image/config'
import type { GptImageConfig } from './gpt-image/types'
import {
  DEFAULT_SEEDREAM_PARAMETERS,
  SEEDREAM_PARAMETERS,
  isSeedreamModel,
} from './seedream/config'
import type { SeedreamConfig } from './seedream/types'

export type ImageModelFamily = 'gpt-image' | 'seedream'

export interface ImageModelRuntimeLimits {
  maxImages: number
  maxReferenceImages: number
  maxTotalImages: number | null
  usesGenerationEndpointForEdits: boolean
}

export interface GptImageAdapter {
  family: 'gpt-image'
  defaultParameters: GptImageConfig
  runtimeLimits: ImageModelRuntimeLimits
}

export interface SeedreamAdapter {
  family: 'seedream'
  defaultParameters: SeedreamConfig
  runtimeLimits: ImageModelRuntimeLimits
}

export type ImageModelAdapter = GptImageAdapter | SeedreamAdapter

export function resolveImageModelAdapter(
  model: string
): ImageModelAdapter | null {
  if (isGptImageModel(model)) {
    return {
      family: 'gpt-image',
      defaultParameters: DEFAULT_GPT_IMAGE_PARAMETERS,
      runtimeLimits: GPT_IMAGE_PARAMETERS.runtimeLimits,
    }
  }
  if (isSeedreamModel(model)) {
    return {
      family: 'seedream',
      defaultParameters: DEFAULT_SEEDREAM_PARAMETERS,
      runtimeLimits: SEEDREAM_PARAMETERS.runtimeLimits,
    }
  }
  return null
}

export function isSupportedImageModel(model: string): boolean {
  return resolveImageModelAdapter(model) !== null
}

export function getImageModelRuntimeLimits(
  model: string
): ImageModelRuntimeLimits | null {
  return resolveImageModelAdapter(model)?.runtimeLimits ?? null
}

export function createDefaultParametersForModel(
  model: string
): ImageStudioParameters | null {
  const adapter = resolveImageModelAdapter(model)
  return adapter ? { ...adapter.defaultParameters } : null
}

export function normalizeConfigForModel(
  config: ImageStudioConfig
): ImageStudioConfig | null {
  const adapter = resolveImageModelAdapter(config.model)
  if (!adapter) return null
  if (adapter.family === 'gpt-image') {
    const sourceParameters =
      config.parameters.family === 'gpt-image'
        ? config.parameters
        : adapter.defaultParameters
    return {
      ...config,
      parameters: GPT_IMAGE_PARAMETERS.normalizeParameters(sourceParameters),
    }
  }
  const sourceParameters =
    config.parameters.family === 'seedream'
      ? config.parameters
      : adapter.defaultParameters
  return {
    ...config,
    parameters: SEEDREAM_PARAMETERS.normalizeParameters(sourceParameters),
  }
}

export function isCustomSizeValid(config: ImageStudioConfig): boolean {
  const adapter = resolveImageModelAdapter(config.model)
  if (!adapter || adapter.family !== config.parameters.family) return false
  if (config.parameters.family === 'gpt-image') {
    return GPT_IMAGE_PARAMETERS.isCustomSizeValid(config.parameters)
  }
  return SEEDREAM_PARAMETERS.isCustomSizeValid(config.parameters)
}

export function resolveParameterSize(
  parameters: ImageStudioParameters
): string {
  if (parameters.size !== CUSTOM_SIZE) return parameters.size
  return `${parameters.customWidth}x${parameters.customHeight}`
}

export function buildImageGenerationPayload(
  config: ImageStudioConfig,
  prompt: string,
  mode: StudioMode,
  referenceImages: ReferenceImage[]
): ImageGenerationPayload {
  const adapter = resolveImageModelAdapter(config.model)
  if (!adapter || adapter.family !== config.parameters.family) {
    throw new Error(`Unsupported image model: ${config.model}`)
  }
  let modelPayload: Partial<ImageGenerationPayload>
  if (config.parameters.family === 'gpt-image') {
    modelPayload = GPT_IMAGE_PARAMETERS.buildPayload(config.parameters, mode)
  } else {
    modelPayload = SEEDREAM_PARAMETERS.buildPayload(config.parameters)
  }
  const payload: ImageGenerationPayload = {
    model: config.model,
    group: config.group,
    prompt,
    ...modelPayload,
  }
  const size = resolveParameterSize(config.parameters)
  if (size && size !== 'auto') payload.size = size
  if (mode === 'edit') {
    payload.image = referenceImages.map((image) => image.dataUrl)
  }
  return payload
}

export function restoreParametersFromRecord(
  record: GenerationRecord
): ImageStudioParameters | null {
  const adapter = resolveImageModelAdapter(record.model)
  if (!adapter) return null
  if (
    record.parameterSnapshot?.family === 'gpt-image' &&
    adapter.family === 'gpt-image'
  ) {
    return GPT_IMAGE_PARAMETERS.normalizeParameters(record.parameterSnapshot)
  }
  if (
    record.parameterSnapshot?.family === 'seedream' &&
    adapter.family === 'seedream'
  ) {
    return SEEDREAM_PARAMETERS.normalizeParameters(record.parameterSnapshot)
  }
  if (adapter.family === 'gpt-image') {
    return GPT_IMAGE_PARAMETERS.normalizeParameters({
      ...adapter.defaultParameters,
      size: record.size || adapter.defaultParameters.size,
      quality: record.quality ?? adapter.defaultParameters.quality,
      moderation: record.moderation ?? adapter.defaultParameters.moderation,
      outputFormat:
        record.outputFormat ?? adapter.defaultParameters.outputFormat,
      n: record.n,
    })
  }
  return SEEDREAM_PARAMETERS.normalizeParameters({
    ...adapter.defaultParameters,
    size: record.size || adapter.defaultParameters.size,
    outputFormat: record.outputFormat ?? adapter.defaultParameters.outputFormat,
    n: record.n,
  })
}
