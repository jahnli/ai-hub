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
import type { ImageStudioConfig, PromptPreset } from './types'

export const API_ENDPOINTS = {
  IMAGE_GENERATIONS: '/pg/images/generations',
  IMAGE_EDITS: '/pg/images/edits',
  USER_MODELS: '/api/user/models',
  USER_GROUPS: '/api/user/self/groups',
} as const

export const DEFAULT_GROUP = 'default' as const

export const CUSTOM_SIZE = 'custom' as const

/** Common size presets across providers (dall-e / gpt-image / seedream / cogview...) */
export const SIZE_PRESETS = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '1536x1024',
  '1024x1536',
  '512x512',
  '256x256',
  '2048x2048',
] as const

export const GPT_IMAGE_QUALITY_OPTIONS = [
  'auto',
  'low',
  'medium',
  'high',
] as const

export const MODERATION_OPTIONS = ['auto', 'low'] as const

export const GPT_IMAGE_2_BACKGROUND_OPTIONS = ['auto', 'opaque'] as const

export const OUTPUT_FORMAT_OPTIONS = ['png', 'webp', 'jpeg'] as const

export const MAX_IMAGE_COUNT = 10

export const MAX_REFERENCE_IMAGES = 4

/** keyword fragments used to pre-filter image-capable models */
export const IMAGE_MODEL_KEYWORDS = [
  'dall-e',
  'gpt-image',
  'image',
  'cogview',
  'seedream',
  'seededit',
  'doubao',
  'flux',
  'stable-diffusion',
  'sd3',
  'sdxl',
  'wanx',
  'wan2',
  'kolors',
  'hunyuan-image',
  'grok-2-image',
  'imagen',
  'janus',
  'irag',
]

export const DEFAULT_CONFIG: ImageStudioConfig = {
  group: DEFAULT_GROUP,
  model: '',
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

/** fallback estimate (ms) when no local history exists for the model */
export const DEFAULT_ESTIMATE_MS = 60000

/** number of recent generations used for the moving-average estimate */
export const ESTIMATE_SAMPLE_SIZE = 5

export const HISTORY_LIMIT = 200

/**
 * Built-in prompt presets. Category names are i18n keys; prompts are
 * sent to the model as-is (English works best across providers).
 */
export const PROMPT_PRESETS: PromptPreset[] = [
  {
    category: 'Factory & Manufacturing',
    prompts: [
      'A modern smart factory floor with orange robotic arms assembling products on a conveyor belt, bright industrial lighting, clean high-tech environment, wide angle, photorealistic',
      'Aerial view of a large automated warehouse with AGV robots moving between tall shelves, blue accent lighting, futuristic logistics center, ultra detailed',
      'Engineers in safety helmets monitoring a digital twin dashboard of a production line, large screens with charts, industrial control room, cinematic lighting',
      'Close-up of a precision CNC machine milling a metal part, sparks and coolant mist, shallow depth of field, industrial photography',
    ],
  },
  {
    category: 'Semiconductor & Chips',
    prompts: [
      'Macro photograph of a silicon wafer with iridescent chip dies reflecting rainbow light, cleanroom background, extreme detail, studio lighting',
      'A futuristic semiconductor fab cleanroom with engineers in white bunny suits operating EUV lithography machines, purple and blue lighting, photorealistic',
      'Detailed 3D render of a CPU chip on a circuit board with glowing golden circuit traces, dark background, dramatic tech lighting, isometric view',
      'Nanoscale visualization of transistor structures on a microchip, abstract electron flow as glowing particles, deep blue color palette, scientific illustration style',
    ],
  },
  {
    category: 'Tech Article Illustration',
    prompts: [
      'Minimalist flat illustration of cloud computing concept, servers and data streams connecting devices, soft gradient background, modern editorial style',
      'Abstract isometric illustration of artificial intelligence neural network, interconnected glowing nodes, pastel color scheme, clean vector style for a tech blog header',
      'Conceptual illustration of cybersecurity, a glowing digital shield protecting data blocks, dark navy background with neon accents, editorial illustration',
      'Futuristic illustration of big data analytics, floating holographic charts and dashboards above a laptop, gradient purple-blue palette, modern tech article cover',
    ],
  },
  {
    category: 'IT & Software',
    prompts: [
      'A developer workspace at night with multiple monitors showing colorful code, mechanical keyboard, ambient RGB lighting, cozy tech atmosphere, photorealistic',
      'Isometric illustration of a DevOps pipeline with build, test and deploy stages as a factory assembly line, flat design, blue and teal colors',
      'A modern server room with rows of glowing racks and fiber optic cables, symmetric composition, cool blue tones, cinematic depth',
      'Team of software engineers collaborating around a whiteboard full of system architecture diagrams, bright modern office, candid documentary style',
    ],
  },
]
