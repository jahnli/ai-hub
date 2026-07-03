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

export const MAX_IMAGE_COUNT = 4

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
    category: '赛美特 AI 智能制造',
    prompts: [
      '赛美特 AI 智能制造软件解决方案高端主视觉，未来工业指挥中心连接半导体晶圆厂、光伏工厂、电池产线和流程化工工厂，发光数据流贯穿全场，蓝白企业科技风，照片级真实感，超高清细节',
      'AI 驱动的智能制造平台，将代码和数据转化为精密数字工厂，MES、EAP、APS、YMS、SPC、RTD、FDC、RPA 模块的软件界面悬浮在产线上方，干净高级的企业科技视觉，蓝色渐变光效，电影感构图',
      'AI 驱动价值的高科技制造管理驾驶舱，实时展示生产质量、设备健康、排程计划、良率分析等全息面板，背景为现代化智能工厂车间，专业 B2B 软件营销风格',
      '以软件成就智造的抽象视觉表达，代码流逐渐组成机械臂、生产线、晶圆、太阳能电池片和电池模组，数字化转型概念，优雅蓝银配色，现代企业宣传海报风格',
    ],
  },
  {
    category: '先进制造行业场景',
    prompts: [
      '现代半导体晶圆厂洁净室，自动物料搬运系统与精密设备协同运行，工程师监控 MES 和 EAP 看板，AI 优化数据叠加显示，冷蓝色照明，照片级真实工业科技场景',
      '光伏智能工厂正在生产太阳能电池片和组件，自动串焊机与检测设备高速运行，透明屏幕展示 MES 与 SPC 质量数据，融合绿色能源和先进制造氛围',
      '锂电池制造产线，涂布、卷绕、化成设备自动运行，AGV 物流配送与 AI 质量检测协同工作，实时 APS 排程和 FDC 异常检测看板，电影级工业写实风格',
      '流程化工智能工厂控制中心，操作员通过 AI 软件监控管线、反应釜和能耗数据，大屏展示实时工艺参数，安全智能生产场景，暖色工业照明，高端企业视觉',
      '汽车零部件智能制造车间，六轴机器人、数字孪生投影、自动化检测和 RTD 实时调度协同运行，MES 数据流连接各类设备，干净未来感工厂环境',
      '有色金属智能工厂，自动化铸造设备与高温熔炉运行，AI 视觉质量检测扫描产品，红色熔融金属、银色机械设备与蓝色软件看板形成强烈对比，戏剧化照片级光影',
    ],
  },
  {
    category: '制造软件产品概念',
    prompts: [
      'MES 制造执行系统概念图，中央数字大脑协调智能工厂中的人员、设备、物料、工艺和质量，发光数据线连接各环节，实时生产看板，蓝色企业科技风',
      'EAP 设备自动化系统概念图，半导体设备、机械手和工厂主机系统通过高速数据链路连接，控制指令以发光脉冲形式传递，洁净室科技视觉',
      'APS 高级计划与排程系统可视化，三维生产线与甘特图、AI 优化路径融合展示，跨工厂资源智能平衡，蓝紫色未来软件界面风格',
      'SPC 统计过程控制概念图，精密测量数据形成控制图和提前预警信号，AI 在缺陷发生前识别工艺漂移，干净的数据可视化艺术与工业背景结合',
      'FDC 故障检测与分类系统概念图，AI 之眼扫描制造设备运行信号，绿色正常波形与红色异常信号突出显示，深蓝科技背景，锐利的企业软件海报风格',
      '制造运营中的 RPA 机器人流程自动化，软件机器人在工厂系统之间处理订单、报表和流程审批，数字员工与流程节点悬浮在智能制造办公室上方',
    ],
  },
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
