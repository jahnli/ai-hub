import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import type { GenerationRecord } from '../../types'
import { ResultGrid } from '../result-grid'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

function renderResultGrid(
  record: GenerationRecord | null,
  pendingImageCount: number,
  imageErrors: string[] = [],
  isGenerating = true,
  retryingImageErrorIndexes: number[] = []
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <ResultGrid
        record={record}
        error={null}
        onRetry={() => undefined}
        onRetryImage={() => undefined}
        retryingImageErrorIndexes={retryingImageErrorIndexes}
        onEditImage={() => undefined}
        isGenerating={isGenerating}
        pendingImageCount={pendingImageCount}
        imageErrors={imageErrors}
      />
    </I18nextProvider>
  )
}

describe('image studio result loading slots', () => {
  test('renders one loading frame for every requested image', () => {
    const markup = renderResultGrid(null, 3)

    assert.equal((markup.match(/role="status"/g) ?? []).length, 3)
    assert.equal((markup.match(/aria-label="Loading [1-3]"/g) ?? []).length, 3)
    assert.equal((markup.match(/Generating\.\.\./g) ?? []).length, 3)
  })

  test('shows one error frame without hiding pending frames', () => {
    const errorMessage = 'proxyconnect tcp: unsupported image URL host'
    const markup = renderResultGrid(null, 2, [errorMessage])

    assert.equal((markup.match(/role="alert"/g) ?? []).length, 1)
    assert.equal((markup.match(/role="status"/g) ?? []).length, 2)
    assert.match(markup, /unsupported image URL host/)
  })

  test('shows retry inside a failed image frame after generation finishes', () => {
    const markup = renderResultGrid(null, 0, ['upstream request failed'], false)

    assert.equal((markup.match(/role="alert"/g) ?? []).length, 1)
    assert.match(markup, /<button[^>]*>.*Retry.*<\/button>/s)
    assert.doesNotMatch(markup, /<button[^>]*\sdisabled(?:=""|="disabled")/)
  })

  test('disables retry inside a failed image frame while generation continues', () => {
    const markup = renderResultGrid(null, 1, ['upstream request failed'])

    assert.match(markup, /<button[^>]*disabled[^>]*>.*Retry.*<\/button>/s)
  })

  test('replaces only the retried error frame with a loading frame', () => {
    const record: GenerationRecord = {
      id: 'generation-with-errors',
      createdAt: 1,
      mode: 'generate',
      prompt: 'Partial generation',
      model: 'gpt-image-2',
      group: 'default',
      size: '1024x1024',
      n: 2,
      images: [],
      imageErrors: ['first failed', 'second failed'],
    }
    const markup = renderResultGrid(record, 0, [], false, [1])

    assert.equal((markup.match(/role="alert"/g) ?? []).length, 1)
    assert.equal((markup.match(/role="status"/g) ?? []).length, 1)
    assert.match(markup, /first failed/)
    assert.doesNotMatch(markup, /second failed/)
  })

  test('keeps other failed image retry buttons enabled during a retry', () => {
    const record: GenerationRecord = {
      id: 'generation-with-errors',
      createdAt: 1,
      mode: 'generate',
      prompt: 'Partial generation',
      model: 'gpt-image-2',
      group: 'default',
      size: '1024x1024',
      n: 2,
      images: [],
      imageErrors: ['first failed', 'second failed'],
    }
    const markup = renderResultGrid(record, 0, [], false, [1])

    assert.equal((markup.match(/role="status"/g) ?? []).length, 1)
    assert.equal((markup.match(/<button/g) ?? []).length, 1)
    assert.doesNotMatch(markup, /<button[^>]*\sdisabled(?:=""|="disabled")/)
  })

  test('does not duplicate a historical failed frame while retrying', () => {
    const record: GenerationRecord = {
      id: 'historical-generation-with-failure',
      createdAt: 1,
      mode: 'generate',
      prompt: 'Partial historical generation',
      model: 'gpt-image-2',
      group: 'default',
      size: '1024x1024',
      n: 1,
      images: [],
      failedImageCount: 1,
    }
    const markup = renderResultGrid(
      record,
      0,
      ['stale global error'],
      false,
      [0]
    )

    assert.equal((markup.match(/role="status"/g) ?? []).length, 1)
    assert.equal((markup.match(/role="alert"/g) ?? []).length, 0)
    assert.doesNotMatch(markup, /stale global error/)
  })

  test('replaces completed loading frames with generated images', () => {
    const record: GenerationRecord = {
      id: 'generation-1',
      createdAt: 1,
      mode: 'generate',
      prompt: 'A generated image',
      model: 'gpt-image-2',
      group: 'default',
      size: '1024x1024',
      n: 3,
      images: [
        {
          id: 'image-1',
          src: 'data:image/png;base64,ZmFrZQ==',
        },
      ],
    }
    const markup = renderResultGrid(record, 2)

    assert.equal((markup.match(/<img/g) ?? []).length, 1)
    assert.equal((markup.match(/role="status"/g) ?? []).length, 2)
  })
})
