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
import { CUSTOM_SIZE } from '../../../constants'
import type { SeedreamConfig, SeedreamParameterConfig } from './types'

export const SEEDREAM_PARAMETERS: SeedreamParameterConfig = {
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
  maxImages: 4,
  maxReferenceImages: 10,
  maxTotalImages: 15,
  normalizeConfig(config: SeedreamConfig): SeedreamConfig {
    const nextConfig = { ...config }
    if (
      nextConfig.size === 'auto' ||
      (nextConfig.size !== CUSTOM_SIZE &&
        !this.sizePresets.includes(nextConfig.size))
    ) {
      nextConfig.size = '2K'
    }
    nextConfig.quality = 'auto'
    nextConfig.moderation = 'auto'
    if (!this.outputFormatOptions.includes(nextConfig.outputFormat)) {
      nextConfig.outputFormat = 'jpeg'
    }
    if (
      !this.promptOptimizationOptions.includes(nextConfig.optimizePromptMode)
    ) {
      nextConfig.optimizePromptMode = 'standard'
    }
    nextConfig.outputCompression = null
    nextConfig.n = Math.min(this.maxImages, Math.max(1, nextConfig.n))
    return nextConfig
  },
  isCustomSizeValid(config: SeedreamConfig): boolean {
    if (config.size !== CUSTOM_SIZE) return true
    const width = config.customWidth
    const height = config.customHeight
    if (width <= 0 || height <= 0) return false
    const aspectRatio = width / height
    const pixelCount = width * height
    return (
      width <= 4096 &&
      height <= 4096 &&
      aspectRatio >= 1 / 16 &&
      aspectRatio <= 16 &&
      pixelCount >= 1280 * 720 &&
      pixelCount <= 4096 * 4096
    )
  },
  buildPayload(config: SeedreamConfig) {
    return {
      output_format: config.outputFormat,
      response_format: 'b64_json',
      watermark: config.watermark,
      optimize_prompt_options: {
        mode: config.optimizePromptMode as 'standard' | 'fast',
      },
    }
  },
}

export function isSeedreamModel(model: string): boolean {
  return model.toLowerCase().includes('seedream')
}
