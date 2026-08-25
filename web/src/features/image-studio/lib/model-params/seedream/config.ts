import type { SeedreamConfig, SeedreamParameterConfig } from './types'

const CUSTOM_SIZE = 'custom'

export const DEFAULT_SEEDREAM_PARAMETERS: SeedreamConfig = {
  family: 'seedream',
  size: '2K',
  customWidth: 2048,
  customHeight: 2048,
  n: 1,
  outputFormat: 'jpeg',
  watermark: false,
  optimizePromptMode: 'standard',
}

export const SEEDREAM_PARAMETERS: SeedreamParameterConfig = {
  defaultParameters: DEFAULT_SEEDREAM_PARAMETERS,
  sizePresets: [
    '1K',
    '2K',
    '4K',
    '2048x2048',
    '2304x1728',
    '1728x2304',
    '2560x1440',
    '1440x2560',
    '2496x1664',
    '1664x2496',
    '3024x1296',
  ],
  promptOptimizationOptions: ['standard', 'fast'],
  outputFormatOptions: ['jpeg', 'png'],
  runtimeLimits: {
    maxImages: 8,
    maxReferenceImages: 10,
    maxTotalImages: 15,
    usesGenerationEndpointForEdits: true,
  },
  normalizeParameters(parameters: SeedreamConfig): SeedreamConfig {
    const normalizedParameters = { ...parameters, family: 'seedream' as const }
    if (
      normalizedParameters.size === 'auto' ||
      (normalizedParameters.size !== CUSTOM_SIZE &&
        !this.sizePresets.includes(normalizedParameters.size))
    ) {
      normalizedParameters.size = '2K'
    }
    if (!this.outputFormatOptions.includes(normalizedParameters.outputFormat)) {
      normalizedParameters.outputFormat = 'jpeg'
    }
    if (
      !this.promptOptimizationOptions.includes(
        normalizedParameters.optimizePromptMode
      )
    ) {
      normalizedParameters.optimizePromptMode = 'standard'
    }
    normalizedParameters.n = Math.min(
      this.runtimeLimits.maxImages,
      Math.max(1, normalizedParameters.n)
    )
    return normalizedParameters
  },
  isCustomSizeValid(parameters: SeedreamConfig): boolean {
    if (parameters.size !== CUSTOM_SIZE) return true
    const aspectRatio = parameters.customWidth / parameters.customHeight
    const pixelCount = parameters.customWidth * parameters.customHeight
    return (
      parameters.customWidth > 0 &&
      parameters.customHeight > 0 &&
      parameters.customWidth <= 4096 &&
      parameters.customHeight <= 4096 &&
      aspectRatio >= 1 / 16 &&
      aspectRatio <= 16 &&
      pixelCount >= 1280 * 720 &&
      pixelCount <= 4096 * 4096
    )
  },
  buildPayload(parameters: SeedreamConfig) {
    return {
      output_format: parameters.outputFormat,
      response_format: 'b64_json',
      watermark: parameters.watermark,
      optimize_prompt_options: {
        mode: parameters.optimizePromptMode as 'standard' | 'fast',
      },
    }
  },
}

export function isSeedreamModel(model: string): boolean {
  return model.toLowerCase().includes('seedream')
}
