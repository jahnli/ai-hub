import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import { DEFAULT_GPT_IMAGE_PARAMETERS } from '../../lib/model-params/gpt-image/config'
import { GptImageParams } from '../../lib/model-params/gpt-image/params'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

describe('GPT Image parameter layout', () => {
  test('places image count first and renders advanced controls inline', () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <GptImageParams
          config={{
            ...DEFAULT_GPT_IMAGE_PARAMETERS,
            outputFormat: 'jpeg',
          }}
          updateConfig={() => undefined}
          disabled={false}
        />
      </I18nextProvider>
    )
    const parameterLabels = [
      'Image count',
      'Image size',
      'Quality',
      'Moderation sensitivity',
      'Background',
      'Output format',
      'Output compression',
    ]
    const labelPositions = parameterLabels.map((label) => markup.indexOf(label))

    assert.ok(labelPositions.every((position) => position >= 0))
    assert.deepEqual(
      labelPositions,
      [...labelPositions].sort((left, right) => left - right)
    )
    assert.doesNotMatch(markup, /Advanced parameters/)
    assert.match(
      markup,
      /<input[^>]*type="number"[^>]*aria-label="Image count"/
    )
  })

  test('hides output compression when PNG is selected', () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <GptImageParams
          config={{
            ...DEFAULT_GPT_IMAGE_PARAMETERS,
            outputFormat: 'png',
          }}
          updateConfig={() => undefined}
          disabled={false}
        />
      </I18nextProvider>
    )

    assert.doesNotMatch(markup, /Output compression/)
  })
})
