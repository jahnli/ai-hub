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
import type { GptImageConfig, GptImageParameterConfig } from './types'

export const GPT_IMAGE_PARAMETERS: GptImageParameterConfig = {
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
  maxImages: 4,
  maxReferenceImages: 4,
  normalizeConfig(config: GptImageConfig): GptImageConfig {
    const nextConfig = { ...config }
    const sizeInvalid =
      nextConfig.size !== 'auto' &&
      nextConfig.size !== CUSTOM_SIZE &&
      !this.sizePresets.includes(nextConfig.size)
    if (sizeInvalid) nextConfig.size = 'auto'
    if (!this.qualityOptions.includes(nextConfig.quality)) {
      nextConfig.quality = 'auto'
    }
    if (!this.moderationOptions.includes(nextConfig.moderation)) {
      nextConfig.moderation = 'auto'
    }
    if (!this.backgroundOptions.includes(nextConfig.background)) {
      nextConfig.background = 'auto'
    }
    if (!this.outputFormatOptions.includes(nextConfig.outputFormat)) {
      nextConfig.outputFormat = 'png'
    }
    nextConfig.n = Math.min(this.maxImages, Math.max(1, nextConfig.n))
    return nextConfig
  },
  isCustomSizeValid(config: GptImageConfig): boolean {
    if (config.size !== CUSTOM_SIZE) return true
    const width = config.customWidth
    const height = config.customHeight
    if (width <= 0 || height <= 0) return false
    const aspectRatio = width / height
    return (
      width % 16 === 0 &&
      height % 16 === 0 &&
      aspectRatio >= 1 / 3 &&
      aspectRatio <= 3 &&
      width <= 3840 &&
      height <= 3840 &&
      width * height <= 3840 * 2160
    )
  },
  buildPayload(config: GptImageConfig, mode) {
    const payload: Partial<import('../../../types').ImageGenerationPayload> = {}
    if (config.quality !== 'auto') payload.quality = config.quality
    if (mode === 'generate' && config.moderation !== 'auto') {
      payload.moderation = config.moderation
    }
    if (config.background !== 'auto') payload.background = config.background
    if (config.outputFormat) payload.output_format = config.outputFormat
    if (config.outputCompression !== null) {
      payload.output_compression = config.outputCompression
    }
    return payload
  },
}

export function isGptImageModel(model: string): boolean {
  return model.toLowerCase().includes('gpt-image')
}
