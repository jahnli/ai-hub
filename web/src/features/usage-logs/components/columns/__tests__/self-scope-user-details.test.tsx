import { render } from '@testing-library/react'
import { createInstance } from 'i18next'
import type { ComponentType } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, test, vi } from 'vitest'

import type { UsageLog } from '../../../data/schema'
import { UsageLogsProvider } from '../../usage-logs-provider'
import { useCommonLogsColumns } from '../common-logs-columns'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

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
  test('keeps the avatar, identity text, and profile detail affordance visible', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <UsageLogsProvider>
          <SelfScopeUserCell />
        </UsageLogsProvider>
      </I18nextProvider>
    )

    expect(container).toHaveTextContent('Alice Example')
    expect(container).toHaveTextContent('alice')
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull()
    expect(
      container.querySelector('[data-slot="hover-card-trigger"]')
    ).not.toBeNull()
  })
})
