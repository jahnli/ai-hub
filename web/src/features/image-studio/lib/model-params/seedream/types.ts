import type { ImageGenerationPayload } from '../../../types'

export interface SeedreamConfig {
  family: 'seedream'
  size: string
  customWidth: number
  customHeight: number
  n: number
  outputFormat: string
  watermark: boolean
  optimizePromptMode: string
}

export type SeedreamConfigUpdater = <Key extends keyof SeedreamConfig>(
  key: Key,
  value: SeedreamConfig[Key]
) => void

export interface SeedreamParameterConfig {
  defaultParameters: SeedreamConfig
  sizePresets: readonly string[]
  promptOptimizationOptions: readonly string[]
  outputFormatOptions: readonly string[]
  runtimeLimits: {
    maxImages: number
    maxReferenceImages: number
    maxTotalImages: number
    usesGenerationEndpointForEdits: true
  }
  normalizeParameters: (parameters: SeedreamConfig) => SeedreamConfig
  isCustomSizeValid: (parameters: SeedreamConfig) => boolean
  buildPayload: (parameters: SeedreamConfig) => Partial<ImageGenerationPayload>
}
