import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, test, vi } from 'vitest'

import type { GenerationRecord } from '../../types'

type ChildrenProps = { children?: ReactNode }

vi.mock('@/components/ui/alert-dialog', () => ({
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
