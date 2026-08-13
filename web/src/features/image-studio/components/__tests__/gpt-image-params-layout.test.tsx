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
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import { DEFAULT_CONFIG } from '../../constants'
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
          config={{ ...DEFAULT_CONFIG, model: 'gpt-image-2' }}
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
  })
})
