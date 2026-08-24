import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'MouseEvent',
  'PointerEvent',
  'FocusEvent',
  'CustomEvent',
  'customElements',
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
Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: domWindow.matchMedia.bind(domWindow),
})

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Request Model:': 'Request Model:',
        'Actual Model:': 'Actual Model:',
      },
    },
  },
})

const { ModelBadge } = await import('../model-badge')
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

async function waitForElement(selector: string): Promise<Element> {
  const existing = document.querySelector(selector)
  if (existing) return existing

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (!element) return

      observer.disconnect()
      clearTimeout(timeout)
      resolve(element)
    })
    const timeout = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Timed out waiting for ${selector}`))
    }, 1000)

    observer.observe(document.body, { childList: true, subtree: true })
  })
}

describe('mapped model badge details', () => {
  after(() => {
    domWindow.close()
  })

  test('uses a hover card and shows complete long model names without clicking', async () => {
    const requestModel =
      'customer-facing-model-name-with-a-very-long-version-suffix-2026-08-24'
    const actualModel =
      'provider/internal-upstream-model-name-with-an-equally-long-version-suffix'
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <ModelBadge modelName={requestModel} actualModel={actualModel} />
        </I18nextProvider>
      )
    })

    const trigger = container.querySelector<HTMLElement>(
      '[data-slot="hover-card-trigger"]'
    )
    assert.ok(trigger)
    assert.equal(container.querySelector('[data-slot="popover-trigger"]'), null)

    const matches = trigger.matches.bind(trigger)
    trigger.matches = (selector) =>
      selector === ':focus-visible' || matches(selector)

    await act(async () => {
      trigger.focus()
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await waitForElement('[data-slot="hover-card-content"]')
    })

    const details = document.querySelector<HTMLElement>(
      '[data-slot="hover-card-content"]'
    )
    assert.ok(details)
    assert.match(details.className, /w-\[24rem\]/)
    assert.equal(details.textContent?.includes(requestModel), true)
    assert.equal(details.textContent?.includes(actualModel), true)
    assert.equal(details.querySelectorAll('.break-all').length, 2)
    assert.equal(details.querySelector('.truncate'), null)

    await act(async () => root.unmount())
    container.remove()
  })
})
