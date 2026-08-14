import type {
  ImageGenerationPayload,
  ImageStudioConfig,
  StudioMode,
} from '../../../types'

export type GptImageConfig = ImageStudioConfig

export interface GptImageParameterConfig {
  sizePresets: readonly string[]
  qualityOptions: readonly string[]
  moderationOptions: readonly string[]
  backgroundOptions: readonly string[]
  outputFormatOptions: readonly string[]
  maxImages: number
  maxReferenceImages: number
  normalizeConfig: (config: GptImageConfig) => GptImageConfig
  isCustomSizeValid: (config: GptImageConfig) => boolean
  buildPayload: (
    config: GptImageConfig,
    mode: StudioMode
  ) => Partial<ImageGenerationPayload>
}
