import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { assert, describe, expect, test } from 'vitest'

import { DEFAULT_SEEDREAM_PARAMETERS } from '../../lib/model-params/seedream/config'
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
            ...DEFAULT_SEEDREAM_PARAMETERS,
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
    expect(markup).not.toMatch(/Advanced parameters/)
    assert.match(
      markup,
      /<input[^>]*type="number"[^>]*aria-label="Image count"/
    )
  })
})
