import type { GptImageConfig, GptImageParameterConfig } from './types'

const CUSTOM_SIZE = 'custom'

export const DEFAULT_GPT_IMAGE_PARAMETERS: GptImageConfig = {
  family: 'gpt-image',
  size: 'auto',
  customWidth: 1024,
  customHeight: 1024,
  quality: 'auto',
  moderation: 'auto',
  n: 1,
  background: 'auto',
  outputFormat: 'png',
  outputCompression: null,
}

export const GPT_IMAGE_PARAMETERS: GptImageParameterConfig = {
  defaultParameters: DEFAULT_GPT_IMAGE_PARAMETERS,
  sizePresets: [
    '1024x1024',
    '1024x1792',
    '1792x1024',
    '1536x1024',
    '1024x1536',
    '512x512',
    '256x256',
    '2048x2048',
    '3840x2160',
  ],
  qualityOptions: ['auto', 'low', 'medium', 'high'],
  moderationOptions: ['auto', 'low'],
  backgroundOptions: ['auto', 'opaque'],
  outputFormatOptions: ['png', 'webp', 'jpeg'],
  runtimeLimits: {
    maxImages: 8,
    maxReferenceImages: 4,
    maxTotalImages: null,
    usesGenerationEndpointForEdits: false,
  },
  normalizeParameters(parameters: GptImageConfig): GptImageConfig {
    const normalizedParameters = { ...parameters, family: 'gpt-image' as const }
    const sizeInvalid =
      normalizedParameters.size !== 'auto' &&
      normalizedParameters.size !== CUSTOM_SIZE &&
      !this.sizePresets.includes(normalizedParameters.size)
    if (sizeInvalid) normalizedParameters.size = 'auto'
    if (!this.qualityOptions.includes(normalizedParameters.quality)) {
      normalizedParameters.quality = 'auto'
    }
    if (!this.moderationOptions.includes(normalizedParameters.moderation)) {
      normalizedParameters.moderation = 'auto'
    }
    if (!this.backgroundOptions.includes(normalizedParameters.background)) {
      normalizedParameters.background = 'auto'
    }
    if (!this.outputFormatOptions.includes(normalizedParameters.outputFormat)) {
      normalizedParameters.outputFormat = 'png'
    }
    normalizedParameters.n = Math.min(
      this.runtimeLimits.maxImages,
      Math.max(1, normalizedParameters.n)
    )
    return normalizedParameters
  },
  isCustomSizeValid(parameters: GptImageConfig): boolean {
    if (parameters.size !== CUSTOM_SIZE) return true
    const aspectRatio = parameters.customWidth / parameters.customHeight
    return (
      parameters.customWidth > 0 &&
      parameters.customHeight > 0 &&
      parameters.customWidth % 16 === 0 &&
      parameters.customHeight % 16 === 0 &&
      aspectRatio >= 1 / 3 &&
      aspectRatio <= 3 &&
      parameters.customWidth <= 3840 &&
      parameters.customHeight <= 3840 &&
      parameters.customWidth * parameters.customHeight <= 3840 * 2160
    )
  },
  buildPayload(parameters: GptImageConfig, mode) {
    const payload: Partial<import('../../../types').ImageGenerationPayload> = {}
    if (parameters.quality !== 'auto') payload.quality = parameters.quality
    if (mode === 'generate' && parameters.moderation !== 'auto') {
      payload.moderation = parameters.moderation
    }
    if (parameters.background !== 'auto') {
      payload.background = parameters.background
    }
    if (parameters.outputFormat) {
      payload.output_format = parameters.outputFormat
    }
    const outputCompressionSupported =
      parameters.outputFormat === 'jpeg' || parameters.outputFormat === 'webp'
    if (outputCompressionSupported && parameters.outputCompression !== null) {
      payload.output_compression = parameters.outputCompression
    }
    return payload
  },
}

export function isGptImageModel(model: string): boolean {
  return model.toLowerCase().includes('gpt-image')
}
