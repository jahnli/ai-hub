import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { DEFAULT_CONFIG } from '../../constants'
import {
  buildImageGenerationPayload,
  getImageModelRuntimeLimits,
  isCustomSizeValid,
  normalizeConfigForModel,
} from '../model-params'
import { SEEDREAM_PARAMETERS } from '../model-params/seedream/config'

describe('image studio model parameters', () => {
  test('watermark is disabled by default', () => {
    assert.equal(DEFAULT_CONFIG.watermark, false)
  })

  test('selecting Seedream resets incompatible GPT Image parameters', () => {
    const normalized = normalizeConfigForModel({
      ...DEFAULT_CONFIG,
      model: 'doubao-seedream-4-0-250828',
      size: 'auto',
      quality: 'high',
      moderation: 'low',
      background: 'opaque',
      outputFormat: 'webp',
    })

    assert.equal(normalized.size, '2K')
    assert.equal(normalized.quality, 'auto')
    assert.equal(normalized.moderation, 'auto')
    assert.equal(normalized.outputFormat, 'jpeg')
    assert.equal(normalized.outputCompression, null)
  })

  test('Seedream exposes its documented size and generation controls', () => {
    const runtimeLimits = getImageModelRuntimeLimits('seedream-4-0-250828')

    assert.deepEqual(SEEDREAM_PARAMETERS.sizePresets.slice(0, 3), [
      '1K',
      '2K',
      '4K',
    ])
    assert.equal(runtimeLimits.maxImages, 8)
    assert.equal(
      normalizeConfigForModel({
        ...DEFAULT_CONFIG,
        model: 'seedream-4-0-250828',
        n: 9,
      }).n,
      8
    )
    assert.deepEqual(SEEDREAM_PARAMETERS.outputFormatOptions, ['jpeg', 'png'])
    assert.deepEqual(SEEDREAM_PARAMETERS.promptOptimizationOptions, [
      'standard',
      'fast',
    ])
  })

  test('Seedream custom dimensions enforce documented pixel boundaries', () => {
    const validConfig = {
      ...DEFAULT_CONFIG,
      model: 'seedream-4-0-250828',
      size: 'custom',
      customWidth: 1920,
      customHeight: 1080,
    }

    assert.equal(isCustomSizeValid(validConfig), true)
    assert.equal(
      isCustomSizeValid({
        ...validConfig,
        customWidth: 100,
        customHeight: 1600,
      }),
      false
    )
    assert.equal(
      isCustomSizeValid({
        ...validConfig,
        customWidth: 5000,
        customHeight: 5000,
      }),
      false
    )
  })

  test('Seedream requests Base64 output and omits unsupported background parameters', () => {
    const payload = buildImageGenerationPayload(
      {
        ...DEFAULT_CONFIG,
        model: 'doubao-seedream-4-0-250828',
        size: '4K',
        n: 4,
        watermark: false,
        optimizePromptMode: 'fast',
        background: 'transparent',
        outputFormat: 'png',
      },
      'A product poster',
      'generate',
      []
    )

    assert.deepEqual(payload, {
      model: 'doubao-seedream-4-0-250828',
      group: 'default',
      prompt: 'A product poster',
      size: '4K',
      output_format: 'png',
      response_format: 'b64_json',
      watermark: false,
      optimize_prompt_options: { mode: 'fast' },
    })
  })

  test('GPT Image payload does not receive Seedream-only parameters', () => {
    const payload = buildImageGenerationPayload(
      {
        ...DEFAULT_CONFIG,
        model: 'gpt-image-2',
        quality: 'high',
        n: 2,
      },
      'A landscape',
      'generate',
      []
    )

    assert.equal(payload.quality, 'high')
    assert.equal(payload.watermark, undefined)
    assert.equal(payload.optimize_prompt_options, undefined)
    assert.equal(payload.sequential_image_generation, undefined)
  })

  test('GPT Image only sends output compression for JPEG and WebP', () => {
    const pngPayload = buildImageGenerationPayload(
      {
        ...DEFAULT_CONFIG,
        model: 'gpt-image-2',
        outputFormat: 'png',
        outputCompression: 50,
      },
      'A landscape',
      'generate',
      []
    )
    const jpegPayload = buildImageGenerationPayload(
      {
        ...DEFAULT_CONFIG,
        model: 'gpt-image-2',
        outputFormat: 'jpeg',
        outputCompression: 50,
      },
      'A landscape',
      'generate',
      []
    )

    assert.equal(pngPayload.output_compression, undefined)
    assert.equal(jpegPayload.output_compression, 50)
  })
})
