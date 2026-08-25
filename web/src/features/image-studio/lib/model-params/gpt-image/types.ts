import type { ImageGenerationPayload, StudioMode } from '../../../types'

export interface GptImageConfig {
  family: 'gpt-image'
  size: string
  customWidth: number
  customHeight: number
  quality: string
  moderation: string
  n: number
  background: string
  outputFormat: string
  outputCompression: number | null
}

export type GptImageConfigUpdater = <Key extends keyof GptImageConfig>(
  key: Key,
  value: GptImageConfig[Key]
) => void

export interface GptImageParameterConfig {
  defaultParameters: GptImageConfig
  sizePresets: readonly string[]
  qualityOptions: readonly string[]
  moderationOptions: readonly string[]
  backgroundOptions: readonly string[]
  outputFormatOptions: readonly string[]
  runtimeLimits: {
    maxImages: number
    maxReferenceImages: number
    maxTotalImages: null
    usesGenerationEndpointForEdits: false
  }
  normalizeParameters: (parameters: GptImageConfig) => GptImageConfig
  isCustomSizeValid: (parameters: GptImageConfig) => boolean
  buildPayload: (
    parameters: GptImageConfig,
    mode: StudioMode
  ) => Partial<ImageGenerationPayload>
}
