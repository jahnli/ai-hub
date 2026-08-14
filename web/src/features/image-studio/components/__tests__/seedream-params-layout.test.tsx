import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import { DEFAULT_CONFIG } from '../../constants'
import { SeedreamParams } from '../../lib/model-params/seedream/params'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

describe('Seedream parameter layout', () => {
  test('places image count first, watermark last, and renders controls inline', () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SeedreamParams
          config={{
            ...DEFAULT_CONFIG,
            model: 'doubao-seedream-4-0-250828',
            size: '2K',
          }}
          updateConfig={() => undefined}
          disabled={false}
        />
      </I18nextProvider>
    )
    const parameterLabels = [
      'Image count',
      'Image size',
      'Prompt optimization',
      'Output format',
      'Watermark',
    ]
    const labelPositions = parameterLabels.map((label) => markup.indexOf(label))

    assert.ok(labelPositions.every((position) => position >= 0))
    assert.deepEqual(
      labelPositions,
      [...labelPositions].sort((left, right) => left - right)
    )
    assert.doesNotMatch(markup, /Advanced parameters/)
  })
})
