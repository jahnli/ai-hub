import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, test } from 'vitest'

import { DepartmentOverviewSkeleton } from '../department-overview-skeleton'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'Loading...': 'Loading...',
        'Sub-department Statistics': 'Sub-department Statistics',
        'Department User List': 'Department User List',
      },
    },
  },
})

describe('department overview skeleton', () => {
  test('renders an accessible loading placeholder while department tree is loading', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DepartmentOverviewSkeleton />
      </I18nextProvider>
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Loading...')
    expect(html).toContain('data-slot="skeleton"')
    expect(html).toContain('Sub-department Statistics')
    expect(html).toContain('Department User List')
  })
})
