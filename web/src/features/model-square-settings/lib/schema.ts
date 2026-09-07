import type { TFunction } from 'i18next'
import { z } from 'zod'

import { MODEL_SQUARE_SCENARIOS } from '../types'

export function createModelSquareConfigSchema(t: TFunction) {
  return z
    .object({
      enabled: z.boolean(),
      recommendations: z
        .array(
          z.object({
            model_name: z
              .string()
              .min(1, t('Select a model'))
              .max(128, t('Model name must not exceed 128 characters')),
            scenario: z.enum(MODEL_SQUARE_SCENARIOS),
            enabled: z.boolean(),
            priority: z
              .number({
                error: t('Priority must be an integer from 0 to 9999'),
              })
              .int(t('Priority must be an integer from 0 to 9999'))
              .min(0, t('Priority must be an integer from 0 to 9999'))
              .max(9999, t('Priority must be an integer from 0 to 9999')),
          })
        )
        .max(100, t('You can configure up to 100 recommendations')),
    })
    .superRefine((config, context) => {
      const seen = new Set<string>()
      config.recommendations.forEach((recommendation, index) => {
        const key = JSON.stringify([
          recommendation.scenario,
          recommendation.model_name,
        ])
        if (seen.has(key)) {
          context.addIssue({
            code: 'custom',
            path: ['recommendations', index, 'model_name'],
            message: t('This model is already recommended for this scenario'),
          })
        }
        seen.add(key)
      })
    })
}

export type ModelSquareFormValues = z.infer<
  ReturnType<typeof createModelSquareConfigSchema>
>
