import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  applyModelPricingDraft,
  type ModelPricingMapValues,
} from '../model-pricing-maps'
import { buildModelSnapshots } from '../model-pricing-snapshots'

const emptyMaps: ModelPricingMapValues = {
  ModelPrice: '{}',
  ModelRatio: '{}',
  CacheRatio: '{}',
  CreateCacheRatio: '{}',
  CompletionRatio: '{}',
  ImageRatio: '{}',
  AudioRatio: '{}',
  AudioCompletionRatio: '{}',
  'billing_setting.billing_mode': '{}',
  'billing_setting.billing_expr': '{}',
}

function parseMap(value: string): Record<string, number | string> {
  return JSON.parse(value) as Record<string, number | string>
}

describe('model pricing map updates', () => {
  test('recognizes dynamic billing before fixed-price fallback', () => {
    const snapshots = buildModelSnapshots({
      modelPrice: '{"dynamic-model":0.02}',
      modelRatio: '{"dynamic-model":1}',
      cacheRatio: '{}',
      createCacheRatio: '{}',
      completionRatio: '{}',
      imageRatio: '{}',
      audioRatio: '{}',
      audioCompletionRatio: '{}',
      billingMode: '{"dynamic-model":"tiered_expr"}',
      billingExpr:
        '{"dynamic-model":"(tier(\\"base\\", p + c)) * ((param(\\"batch\\") != nil && param(\\"batch\\") == true) ? 2 : 1)"}',
    })

    assert.equal(snapshots[0]?.billingMode, 'tiered_expr')
    assert.equal(snapshots[0]?.price, '0.02')
    assert.match(snapshots[0]?.billingExpr ?? '', /tier/)
  })

  test('writes expression rules together with numeric fallback maps', () => {
    const result = applyModelPricingDraft(emptyMaps, {
      name: 'dynamic-model',
      billingMode: 'tiered_expr',
      billingExpr: 'tier("base", p + c)',
      requestRuleExpr: 'request.rule("batch", true)',
      price: '0.02',
      ratio: '1',
      cacheRatio: '0',
      createCacheRatio: '1.25',
    })

    assert.equal(parseMap(result.ModelPrice)['dynamic-model'], 0.02)
    assert.equal(parseMap(result.ModelRatio)['dynamic-model'], 1)
    assert.equal(parseMap(result.CacheRatio)['dynamic-model'], 0)
    assert.equal(parseMap(result.CreateCacheRatio)['dynamic-model'], 1.25)
    assert.equal(
      parseMap(result['billing_setting.billing_mode'])['dynamic-model'],
      'tiered_expr'
    )
    assert.match(
      String(parseMap(result['billing_setting.billing_expr'])['dynamic-model']),
      /request\.rule/
    )
  })

  test('cleans incompatible maps when switching pricing modes', () => {
    const current = {
      ...emptyMaps,
      ModelRatio: '{"model":1}',
      CacheRatio: '{"model":0.1}',
      'billing_setting.billing_mode': '{"model":"tiered_expr"}',
      'billing_setting.billing_expr': '{"model":"tier(\\"base\\", p)"}',
    }
    const result = applyModelPricingDraft(current, {
      name: 'model',
      billingMode: 'per-request',
      price: '0.5',
    })

    assert.equal(parseMap(result.ModelPrice).model, 0.5)
    assert.equal(parseMap(result.ModelRatio).model, undefined)
    assert.equal(parseMap(result.CacheRatio).model, undefined)
    assert.equal(
      parseMap(result['billing_setting.billing_mode']).model,
      undefined
    )
    assert.equal(
      parseMap(result['billing_setting.billing_expr']).model,
      undefined
    )
  })

  test('migrates every pricing map when a model is renamed', () => {
    const current = Object.fromEntries(
      Object.entries(emptyMaps).map(([key]) => [key, '{"old-model":1}'])
    ) as ModelPricingMapValues
    const result = applyModelPricingDraft(
      current,
      {
        name: 'new-model',
        billingMode: 'per-token',
        ratio: '2',
        cacheRatio: '0.5',
        createCacheRatio: '1.5',
        completionRatio: '3',
        imageRatio: '4',
        audioRatio: '5',
        audioCompletionRatio: '6',
      },
      ['new-model'],
      ['old-model']
    )

    Object.values(result).forEach((value) => {
      assert.equal(parseMap(value)['old-model'], undefined)
    })
    assert.equal(parseMap(result.ModelRatio)['new-model'], 2)
    assert.equal(parseMap(result.CreateCacheRatio)['new-model'], 1.5)
  })

  test('preserves explicit zero values', () => {
    const result = applyModelPricingDraft(emptyMaps, {
      name: 'free-model',
      billingMode: 'per-token',
      ratio: '0',
      completionRatio: '0',
      cacheRatio: '0',
    })

    assert.equal(parseMap(result.ModelRatio)['free-model'], 0)
    assert.equal(parseMap(result.CompletionRatio)['free-model'], 0)
    assert.equal(parseMap(result.CacheRatio)['free-model'], 0)
  })
})
