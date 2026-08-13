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
