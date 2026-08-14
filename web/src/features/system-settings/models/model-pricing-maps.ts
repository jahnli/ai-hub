import { combineBillingExpr } from '@/features/pricing/lib/billing-expr'

import { safeJsonParse } from '../utils/json-parser'
import type { ModelRatioData } from './model-pricing-core'

export type ModelPricingMapValues = {
  ModelPrice: string
  ModelRatio: string
  CacheRatio: string
  CreateCacheRatio: string
  CompletionRatio: string
  ImageRatio: string
  AudioRatio: string
  AudioCompletionRatio: string
  'billing_setting.billing_mode': string
  'billing_setting.billing_expr': string
}

const pricingMapKeys = [
  'ModelPrice',
  'ModelRatio',
  'CacheRatio',
  'CreateCacheRatio',
  'CompletionRatio',
  'ImageRatio',
  'AudioRatio',
  'AudioCompletionRatio',
  'billing_setting.billing_mode',
  'billing_setting.billing_expr',
] as const

function parseNumberMap(value: string): Record<string, number> {
  return safeJsonParse<Record<string, number>>(value, {
    fallback: {},
    silent: true,
  })
}

function parseStringMap(value: string): Record<string, string> {
  return safeJsonParse<Record<string, string>>(value, {
    fallback: {},
    silent: true,
  })
}

function setFiniteNumber(
  target: Record<string, number>,
  modelName: string,
  value: string | undefined
): void {
  if (value === undefined || value === '') return
  const parsedValue = Number(value)
  if (Number.isFinite(parsedValue)) target[modelName] = parsedValue
}

export function applyModelPricingDraft(
  currentValues: ModelPricingMapValues,
  draft: ModelRatioData | null,
  targetNames: string[] = draft ? [draft.name] : [],
  removedNames: string[] = []
): ModelPricingMapValues {
  const priceMap = parseNumberMap(currentValues.ModelPrice)
  const ratioMap = parseNumberMap(currentValues.ModelRatio)
  const cacheMap = parseNumberMap(currentValues.CacheRatio)
  const createCacheMap = parseNumberMap(currentValues.CreateCacheRatio)
  const completionMap = parseNumberMap(currentValues.CompletionRatio)
  const imageMap = parseNumberMap(currentValues.ImageRatio)
  const audioMap = parseNumberMap(currentValues.AudioRatio)
  const audioCompletionMap = parseNumberMap(currentValues.AudioCompletionRatio)
  const billingModeMap = parseStringMap(
    currentValues['billing_setting.billing_mode']
  )
  const billingExprMap = parseStringMap(
    currentValues['billing_setting.billing_expr']
  )

  const allMaps: Array<Record<string, number> | Record<string, string>> = [
    priceMap,
    ratioMap,
    cacheMap,
    createCacheMap,
    completionMap,
    imageMap,
    audioMap,
    audioCompletionMap,
    billingModeMap,
    billingExprMap,
  ]
  const namesToClear = new Set([...removedNames, ...targetNames])
  namesToClear.forEach((modelName) => {
    allMaps.forEach((pricingMap) => delete pricingMap[modelName])
  })

  if (draft) {
    targetNames.forEach((modelName) => {
      if (draft.billingMode === 'tiered_expr') {
        const combinedExpression = combineBillingExpr(
          draft.billingExpr || '',
          draft.requestRuleExpr || ''
        )
        if (combinedExpression) {
          billingModeMap[modelName] = 'tiered_expr'
          billingExprMap[modelName] = combinedExpression
        }

        setFiniteNumber(priceMap, modelName, draft.price)
        setFiniteNumber(ratioMap, modelName, draft.ratio)
        setFiniteNumber(cacheMap, modelName, draft.cacheRatio)
        setFiniteNumber(createCacheMap, modelName, draft.createCacheRatio)
        setFiniteNumber(completionMap, modelName, draft.completionRatio)
        setFiniteNumber(imageMap, modelName, draft.imageRatio)
        setFiniteNumber(audioMap, modelName, draft.audioRatio)
        setFiniteNumber(
          audioCompletionMap,
          modelName,
          draft.audioCompletionRatio
        )
        return
      }

      if (draft.billingMode === 'per-request') {
        setFiniteNumber(priceMap, modelName, draft.price)
        return
      }

      setFiniteNumber(ratioMap, modelName, draft.ratio)
      setFiniteNumber(cacheMap, modelName, draft.cacheRatio)
      setFiniteNumber(createCacheMap, modelName, draft.createCacheRatio)
      setFiniteNumber(completionMap, modelName, draft.completionRatio)
      setFiniteNumber(imageMap, modelName, draft.imageRatio)
      setFiniteNumber(audioMap, modelName, draft.audioRatio)
      setFiniteNumber(audioCompletionMap, modelName, draft.audioCompletionRatio)
    })
  }

  return {
    ModelPrice: JSON.stringify(priceMap, null, 2),
    ModelRatio: JSON.stringify(ratioMap, null, 2),
    CacheRatio: JSON.stringify(cacheMap, null, 2),
    CreateCacheRatio: JSON.stringify(createCacheMap, null, 2),
    CompletionRatio: JSON.stringify(completionMap, null, 2),
    ImageRatio: JSON.stringify(imageMap, null, 2),
    AudioRatio: JSON.stringify(audioMap, null, 2),
    AudioCompletionRatio: JSON.stringify(audioCompletionMap, null, 2),
    'billing_setting.billing_mode': JSON.stringify(billingModeMap, null, 2),
    'billing_setting.billing_expr': JSON.stringify(billingExprMap, null, 2),
  }
}

export function getChangedModelPricingValues(
  currentValues: ModelPricingMapValues,
  nextValues: ModelPricingMapValues
): Array<{ key: keyof ModelPricingMapValues; value: string }> {
  return pricingMapKeys
    .filter((key) => {
      const currentMap = safeJsonParse<unknown>(currentValues[key], {
        fallback: {},
        silent: true,
      })
      const nextMap = safeJsonParse<unknown>(nextValues[key], {
        fallback: {},
        silent: true,
      })
      return JSON.stringify(currentMap) !== JSON.stringify(nextMap)
    })
    .map((key) => ({ key, value: nextValues[key] }))
}
