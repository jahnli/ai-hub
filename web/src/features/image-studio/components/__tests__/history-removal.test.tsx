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

import type { GenerationRecord } from '../../types'

type ChildrenProps = { children?: ReactNode }

mock.module('@/components/ui/alert-dialog', () => ({
  AlertDialog: (props: ChildrenProps) => <div>{props.children}</div>,
  AlertDialogAction: (props: ChildrenProps) => (
    <button type='button'>{props.children}</button>
  ),
  AlertDialogCancel: (props: ChildrenProps) => (
    <button type='button'>{props.children}</button>
  ),
  AlertDialogContent: (props: ChildrenProps) => <div>{props.children}</div>,
  AlertDialogDescription: (props: ChildrenProps) => <p>{props.children}</p>,
  AlertDialogFooter: (props: ChildrenProps) => <div>{props.children}</div>,
  AlertDialogHeader: (props: ChildrenProps) => <div>{props.children}</div>,
  AlertDialogTitle: (props: ChildrenProps) => <h2>{props.children}</h2>,
  AlertDialogTrigger: (props: { render: ReactNode }) => props.render,
}))

const { HistoryPanel } = await import('../history-panel')

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
})

const history: GenerationRecord[] = [
  {
    id: 'generation-1',
    createdAt: 1,
    mode: 'generate',
    prompt: 'test prompt',
    model: 'test-image-model',
    group: 'default',
    size: '1024x1024',
    n: 1,
    images: [],
  },
]

describe('image studio history removal copy', () => {
  test('describes removal as retaining stored records and images', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <HistoryPanel
          history={history}
          activeRecordId={null}
          onRestore={() => undefined}
          onDelete={() => undefined}
          onClear={() => undefined}
          onToggleFavorite={() => undefined}
        />
      </I18nextProvider>
    )

    expect(html).toContain('aria-label="Remove from history"')
    expect(html).toContain(
      'Stored records and image files are retained until the storage limit removes them.'
    )
    expect(html).not.toContain(
      'permanently delete generation history and stored image files'
    )
  })
})
