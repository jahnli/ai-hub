export const MODEL_SQUARE_SCENARIOS = [
  'general',
  'coding',
  'chat',
  'writing',
  'image',
] as const

export type ModelSquareScenario = (typeof MODEL_SQUARE_SCENARIOS)[number]

export type ModelSquareRecommendation = {
  model_name: string
  scenario: ModelSquareScenario
  reason?: string
  enabled: boolean
}

export type ModelSquareConfig = {
  enabled: boolean
  recommendations: ModelSquareRecommendation[]
}

export type ModelSquareConfigData = {
  data: ModelSquareConfig
  models: string[]
}
