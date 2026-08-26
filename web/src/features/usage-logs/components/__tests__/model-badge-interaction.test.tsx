import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, test, vi } from 'vitest'

import { ModelBadge } from '../model-badge'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

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

describe('mapped model badge details', () => {
  test('uses a hover card and shows complete long model names without clicking', async () => {
    const requestModel =
      'customer-facing-model-name-with-a-very-long-version-suffix-2026-08-24'
    const actualModel =
      'provider/internal-upstream-model-name-with-an-equally-long-version-suffix'
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ModelBadge modelName={requestModel} actualModel={actualModel} />
      </I18nextProvider>
    )

    const trigger = container.querySelector<HTMLElement>(
      '[data-slot="hover-card-trigger"]'
    )
    if (!trigger) {
      throw new Error('Hover card trigger was not rendered')
    }
    expect(container.querySelector('[data-slot="popover-trigger"]')).toBeNull()

    const matches = trigger.matches.bind(trigger)
    Object.defineProperty(trigger, 'matches', {
      configurable: true,
      value: (selector: string) =>
        selector === ':focus-visible' || matches(selector),
    })
    fireEvent.focusIn(trigger)

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="hover-card-content"]')
      ).not.toBeNull()
    })

    const details = document.querySelector<HTMLElement>(
      '[data-slot="hover-card-content"]'
    )
    if (!details) {
      throw new Error('Hover card content was not rendered')
    }
    expect(details).toHaveClass('w-[24rem]')
    expect(details).toHaveTextContent(requestModel)
    expect(details).toHaveTextContent(actualModel)
    expect(details.querySelectorAll('.break-all')).toHaveLength(2)
    expect(details.querySelector('.truncate')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
