// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { describe, expect, mock, test } from 'bun:test'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

import type { Company } from '../types'

mock.module('@/components/dialog', () => ({
  Dialog: (props: {
    title: ReactNode
    children: ReactNode
    footer?: ReactNode
  }) => (
    <section role='dialog' aria-labelledby='company-editor-title'>
      <h2 id='company-editor-title'>{props.title}</h2>
      {props.children}
      {props.footer}
    </section>
  ),
}))

mock.module('@/components/ui/dialog', () => ({
  DialogClose: (props: { children: ReactNode }) => (
    <button type='button'>{props.children}</button>
  ),
}))

const { CompanyMutateDialog } =
  await import('../components/company-mutate-sheet')

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

function renderEditor(company: Company | null): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <CompanyMutateDialog
          open
          onOpenChange={() => undefined}
          company={company}
        />
      </QueryClientProvider>
    </I18nextProvider>
  )
}

describe('company editor presentation', () => {
  test('opens company creation as a dialog containing the company form', () => {
    const html = renderEditor(null)

    expect(html).toContain('role="dialog"')
    expect(html).toContain('Create Company')
    expect(html).toContain('id="company-form"')
    expect(html).not.toContain('Leave them blank when editing')
  })

  test('opens company editing as a dialog with the edit title', () => {
    const html = renderEditor({
      id: 1,
      name: 'Example Manufacturing',
      alias: 'Example',
      platform: 'none',
      status: 'enabled',
      sort_order: 10,
      login_methods: ['password'],
    })

    expect(html).toContain('role="dialog"')
    expect(html).toContain('Edit Company')
    expect(html).toContain('id="company-form"')
    expect(html).not.toContain('Leave them blank when editing')
  })
})
