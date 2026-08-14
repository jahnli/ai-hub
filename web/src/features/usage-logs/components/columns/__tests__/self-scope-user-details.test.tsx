import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'
import type { ComponentType } from 'react'

import type { UsageLog } from '../../../data/schema'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLImageElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
  'customElements',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}
document.write('<!doctype html><html><body></body></html>')

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { UsageLogsProvider } = await import('../../usage-logs-provider')
const { useCommonLogsColumns } = await import('../common-logs-columns')

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

const selfLog: UsageLog = {
  id: 1,
  user_id: 42,
  created_at: 100,
  type: 2,
  content: '',
  username: 'alice',
  display_name: 'Alice Example',
  avatar_url: 'https://example.com/alice.png',
  token_name: '',
  model_name: '',
  quota: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  use_time: 0,
  is_stream: false,
  channel: 0,
  channel_name: '',
  token_id: 0,
  group: '',
  ip: '',
  other: '',
  request_id: '',
  upstream_request_id: '',
  open_id: '',
}

function SelfScopeUserCell() {
  const columns = useCommonLogsColumns(false, {
    canFetchUserDetails: true,
    showUserColumn: true,
  })
  const column = columns.find((item) => item.id === 'user')
  if (!column || typeof column.cell !== 'function') {
    throw new TypeError('Expected the self-scope user column to provide a cell')
  }

  const UserCell = column.cell as ComponentType<{
    row: { original: UsageLog }
  }>
  return <UserCell row={{ original: selfLog }} />
}

describe('self-scope usage log user details', () => {
  after(() => {
    domWindow.close()
  })

  test('keeps the avatar, identity text, and profile detail affordance visible', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <UsageLogsProvider>
            <SelfScopeUserCell />
          </UsageLogsProvider>
        </I18nextProvider>
      )
    })

    assert.match(container.textContent ?? '', /Alice Example/)
    assert.match(container.textContent ?? '', /alice/)
    assert.ok(container.querySelector('[data-slot="avatar"]'))
    assert.ok(container.querySelector('[data-slot="hover-card-trigger"]'))

    await act(async () => root.unmount())
    container.remove()
  })
})
