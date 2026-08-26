import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, test } from 'vitest'

import { DepartmentSearchPrompt } from '../department-search-prompt'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'Click Search': 'Click Search',
        'View statistics for the selected department':
          'View statistics for the selected department',
      },
    },
  },
})

describe('department data search prompt', () => {
  test('shows an accessible instruction before department data is searched', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DepartmentSearchPrompt />
      </I18nextProvider>
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('Click Search')
    expect(html).toContain('View statistics for the selected department')
    expect(html).toContain('data-slot="empty-icon"')
  })
})
