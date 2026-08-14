import type { ImageGenerationPayload, ImageStudioConfig } from '../../../types'

export type SeedreamConfig = ImageStudioConfig

export interface SeedreamParameterConfig {
  sizePresets: readonly string[]
  promptOptimizationOptions: readonly string[]
  outputFormatOptions: readonly string[]
  maxImages: number
  maxReferenceImages: number
  maxTotalImages: number
  normalizeConfig: (config: SeedreamConfig) => SeedreamConfig
  isCustomSizeValid: (config: SeedreamConfig) => boolean
  buildPayload: (config: SeedreamConfig) => Partial<ImageGenerationPayload>
}
