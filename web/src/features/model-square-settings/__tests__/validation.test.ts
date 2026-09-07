import { createInstance } from 'i18next'
import { describe, expect, test } from 'vitest'

import { createModelSquareConfigSchema } from '../lib/schema'
import type { ModelSquareRecommendation } from '../types'

const i18n = createInstance()
await i18n.init({ lng: 'en', resources: { en: { translation: {} } } })
const schema = createModelSquareConfigSchema(i18n.t)
const entry: ModelSquareRecommendation = {
  model_name: 'actual-model',
  scenario: 'coding',
  enabled: true,
}

describe('recommendation configuration validation', () => {
  test('preserves exact model names without requiring a reason', () => {
    const config = schema.parse({
      enabled: false,
      recommendations: [
        {
          ...entry,
          model_name: ' actual-model ',
        },
      ],
    })
    expect(config.recommendations[0]).toEqual({
      ...entry,
      model_name: ' actual-model ',
    })
  })

  test.each([
    ['empty model', { model_name: '' }],
    ['long model', { model_name: 'm'.repeat(129) }],
    ['unknown scenario', { scenario: 'other' }],
  ])('rejects %s before saving', (_name, override) => {
    expect(
      schema.safeParse({
        enabled: true,
        recommendations: [{ ...entry, ...override }],
      }).success
    ).toBe(false)
  })

  test('rejects duplicate models in one scenario but allows the same model across scenarios', () => {
    const duplicate = schema.safeParse({
      enabled: true,
      recommendations: [entry, { ...entry, enabled: false }],
    })
    expect(duplicate.success).toBe(false)
    if (!duplicate.success) {
      expect(duplicate.error.issues[0].path).toEqual([
        'recommendations',
        1,
        'model_name',
      ])
    }
    expect(
      schema.safeParse({
        enabled: true,
        recommendations: [entry, { ...entry, scenario: 'chat' }],
      }).success
    ).toBe(true)
  })

  test('strips legacy reasons when saving recommendation configuration', () => {
    const config = schema.parse({
      enabled: true,
      recommendations: [{ ...entry, reason: 'Legacy reason' }],
    })
    expect(config.recommendations).toEqual([entry])
  })

  test('accepts 100 unique recommendations and rejects the 101st', () => {
    const recommendations = Array.from({ length: 100 }, (_, index) => ({
      ...entry,
      model_name: `model-${index}`,
    }))
    expect(schema.safeParse({ enabled: true, recommendations }).success).toBe(
      true
    )
    expect(
      schema.safeParse({
        enabled: true,
        recommendations: [...recommendations, entry],
      }).success
    ).toBe(false)
    expect(
      schema.safeParse({ enabled: false, recommendations: [] }).success
    ).toBe(true)
  })
})
