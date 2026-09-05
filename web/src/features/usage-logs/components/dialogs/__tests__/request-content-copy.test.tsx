import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

import type { UserColumnRow } from '@/features/users/types'

import type { RequestMessage } from '../../../types'
import { RequestContentDialog } from '../request-content-dialog'

vi.mock('@/components/dialog', () => ({
  Dialog: (props: { open: boolean; title: string; children: ReactNode }) =>
    props.open ? (
      <div role='dialog' aria-label={props.title}>
        {props.children}
      </div>
    ) : null,
}))

vi.mock('@/components/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}))

vi.mock('@/features/users/components/user-profile-hover-card', () => ({
  UserProfileHoverCard: (props: { children: ReactNode }) => props.children,
}))

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

const requestMessage: RequestMessage = {
  id: 1,
  request_id: 'request-1',
  user_id: 0,
  token_id: 1,
  model_name: 'test-model',
  relay_format: 'openai',
  created_at: 1_700_000_000,
  user_content: JSON.stringify(['Repeated message', 'Repeated message']),
  parameters: '',
}

const user: UserColumnRow = {
  id: 0,
  username: 'tester',
  display_name: 'Tester',
  quota: 0,
  used_quota: 0,
  sub_quota_used: 0,
  sub_quota_total: 0,
  request_count: 0,
  group: '',
  status: 1,
  role: 1,
}

function getMessageCopyButton(label: string): HTMLButtonElement {
  const message = screen.getByText(label).closest('[data-slot="collapsible"]')
  const button = message?.querySelector<HTMLButtonElement>(
    'button[title="Copy to clipboard"]'
  )
  if (!button) throw new Error(`Missing copy button for ${label}`)
  return button
}

describe('request content copy feedback', () => {
  test('only marks the clicked message as copied when contents are identical', async () => {
    const userEventApi = userEvent.setup()
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <RequestContentDialog
          requestMessage={requestMessage}
          user={user}
          open
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>
    )

    const latestCopyButton = getMessageCopyButton('User message 2')
    const olderCopyButton = getMessageCopyButton('User message 1')
    await userEventApi.click(latestCopyButton)

    expect(latestCopyButton.querySelector('.lucide-check')).not.toBeNull()
    expect(olderCopyButton.querySelector('.lucide-copy')).not.toBeNull()
  })
})
