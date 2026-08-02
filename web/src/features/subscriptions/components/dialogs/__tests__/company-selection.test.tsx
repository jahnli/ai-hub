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

For commercial licensing, please contact support@quantumnous.com
*/
// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { describe, expect, mock, test } from 'bun:test'

import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'

mock.module('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      data: [
        { id: 10, name: 'company-a', alias: 'Company A' },
        { id: 20, name: 'company-b', alias: 'Company B' },
      ],
    },
    isPending: false,
    isError: false,
  }),
}))

mock.module('@/components/confirm-dialog', () => ({
  ConfirmDialog: (props: {
    title: ReactNode
    desc: ReactNode
    disabled?: boolean
    children?: ReactNode
    className?: string
    isLoading?: boolean
  }) => (
    <section
      role='dialog'
      data-class-name={props.className}
      data-loading={String(Boolean(props.isLoading))}
    >
      <h2>{props.title}</h2>
      <div>{props.desc}</div>
      {props.children}
      <button type='button' disabled={props.disabled}>
        Confirm subscribe all users
      </button>
    </section>
  ),
}))

mock.module('@/components/ui/label', () => ({
  Label: (props: { htmlFor?: string; children: ReactNode }) => (
    <label htmlFor={props.htmlFor}>{props.children}</label>
  ),
}))

mock.module('@/components/ui/select', () => ({
  Select: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectContent: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectGroup: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectItem: (props: { children: ReactNode; value: string }) => (
    <div data-value={props.value}>{props.children}</div>
  ),
  SelectTrigger: (props: { id?: string; children: ReactNode }) => (
    <button type='button' id={props.id}>
      {props.children}
    </button>
  ),
  SelectValue: (props: { placeholder?: ReactNode }) => (
    <span>{props.placeholder}</span>
  ),
}))

mock.module('../../subscriptions-provider', () => ({
  useSubscriptions: () => ({
    open: 'subscribe-all',
    setOpen: () => undefined,
    currentRow: { plan: { id: 5, title: 'Team' } },
    triggerRefresh: () => undefined,
  }),
}))

const { SubscribeAllDialog } = await import('../subscribe-all-dialog')

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

describe('subscribe all company selection', () => {
  test('requires an explicit company selection before replacement', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SubscribeAllDialog />
      </I18nextProvider>
    )

    expect(html).toContain('Company A')
    expect(html).toContain('Company B')
    expect(html).toContain('Select company')
    expect(html).toContain(
      'data-class-name="min-h-80 sm:max-w-2xl [&amp;_[data-slot=alert-dialog-footer]]:mt-auto"'
    )
    expect(html).toContain('data-loading="false"')
    expect(html).toContain('disabled=""')
    expect(html).toContain(
      'Select a company to subscribe all its users to Team, including disabled and deleted users.'
    )
  })
})
