import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLImageElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'WheelEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const i18next = (await import('i18next')).default
const { initReactI18next } = await import('react-i18next')
await i18next.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Image preview': 'Image preview',
        'Previous image': 'Previous image',
        'Next image': 'Next image',
        'Zoom out': 'Zoom out',
        'Zoom in': 'Zoom in',
        Rotate: 'Rotate',
        'Reset view': 'Reset view',
        'Copy image': 'Copy image',
        Download: 'Download',
        'Edit this image': 'Edit this image',
      },
    },
  },
})
const { ImagePreviewDialog } = await import('../image-preview-dialog')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type RenderedPreview = {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
}

const images = [
  {
    id: 'first',
    src: 'https://example.com/first.png',
    alt: 'First image',
    description: 'First prompt',
    onCopy: () => undefined,
    onDownload: () => undefined,
  },
  {
    id: 'second',
    src: 'https://example.com/second.png',
    alt: 'Second image',
    description: 'Second prompt',
    onCopy: () => undefined,
    onDownload: () => undefined,
  },
]

async function renderPreview(
  componentProps: React.ComponentProps<typeof ImagePreviewDialog>
): Promise<RenderedPreview> {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<ImagePreviewDialog {...componentProps} />)
  })

  return { container, root }
}

async function unmountPreview(renderedPreview: RenderedPreview) {
  await act(async () => renderedPreview.root.unmount())
  renderedPreview.container.remove()
}

function getButton(accessibleName: string): HTMLButtonElement {
  const matchingButton = [...document.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === accessibleName
  )
  assert.ok(matchingButton instanceof HTMLButtonElement)
  return matchingButton
}

describe('ImagePreviewDialog interactions', () => {
  after(() => {
    domWindow.close()
  })

  test('navigates with shared toolbar controls and resets the transformed view', async () => {
    const renderedPreview = await renderPreview({
      open: true,
      onOpenChange: () => undefined,
      images,
      initialIndex: 0,
    })
    const previewImage = document.querySelector('img[alt="First image"]')
    assert.ok(previewImage instanceof HTMLImageElement)

    await act(async () => getButton('Zoom in').click())
    await act(async () => getButton('Rotate').click())
    assert.equal(previewImage.style.transform, 'scale(1.25) rotate(90deg)')

    await act(async () => getButton('Next image').click())
    const nextImage = document.querySelector('img[alt="Second image"]')
    assert.ok(nextImage instanceof HTMLImageElement)
    assert.equal(nextImage.style.transform, 'scale(1) rotate(0deg)')
    assert.match(document.body.textContent ?? '', /2 \/ 2/)
    assert.match(document.body.textContent ?? '', /Second prompt/)

    await unmountPreview(renderedPreview)
  })

  test('wraps keyboard navigation and exposes edit only when provided', async () => {
    const editCalls: string[] = []
    const openChanges: boolean[] = []
    const renderedPreview = await renderPreview({
      open: true,
      onOpenChange: (open) => openChanges.push(open),
      images: [
        images[0],
        {
          ...images[1],
          onEdit: () => editCalls.push('second'),
        },
      ],
      initialIndex: 0,
    })
    const dialog = document.querySelector('[role="dialog"]')
    assert.ok(dialog instanceof HTMLElement)
    assert.equal(
      document.querySelector('button[aria-label="Edit this image"]'),
      null
    )

    await act(async () => {
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      )
    })
    assert.ok(document.querySelector('img[alt="Second image"]'))

    await act(async () => getButton('Edit this image').click())
    assert.deepEqual(editCalls, ['second'])
    assert.deepEqual(openChanges, [false])

    await unmountPreview(renderedPreview)
  })
})
