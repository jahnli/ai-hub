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

const requestMessage: RequestMessage = {
  id: 1,
  request_id: 'request-1',
  user_id: 0,
  token_id: 1,
  model_name: 'test-model',
  relay_format: 'openai',
  created_at: 1_700_000_000,
  user_content: JSON.stringify(['First message', 'Second message']),
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

function renderDialog() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <RequestContentDialog
        requestMessage={requestMessage}
        user={user}
        open
        onOpenChange={vi.fn()}
      />
    </QueryClientProvider>
  )
}

function getMessageTriggers(): HTMLElement[] {
  return ['User message 2', 'User message 1'].map((label) => {
    const trigger = screen
      .getByText(label)
      .closest<HTMLElement>('[data-slot="collapsible-trigger"]')
    if (!trigger) throw new Error(`Missing trigger for ${label}`)
    return trigger
  })
}

describe('request content message collapse controls', () => {
  test('uses one control to collapse and expand every message', async () => {
    const userEventApi = userEvent.setup()
    renderDialog()

    for (const trigger of getMessageTriggers()) {
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    }
    expect(
      screen.queryByRole('button', { name: 'Expand All' })
    ).not.toBeInTheDocument()

    await userEventApi.click(
      screen.getByRole('button', { name: 'Collapse All' })
    )
    for (const trigger of getMessageTriggers()) {
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }
    expect(
      screen.queryByRole('button', { name: 'Collapse All' })
    ).not.toBeInTheDocument()

    await userEventApi.click(screen.getByRole('button', { name: 'Expand All' }))
    for (const trigger of getMessageTriggers()) {
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    }
  })

  test('keeps individual message toggles available after collapsing all', async () => {
    const userEventApi = userEvent.setup()
    renderDialog()

    await userEventApi.click(
      screen.getByRole('button', { name: 'Collapse All' })
    )
    const [latestTrigger, olderTrigger] = getMessageTriggers()
    await userEventApi.click(latestTrigger)

    expect(latestTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(olderTrigger).toHaveAttribute('aria-expanded', 'false')
  })
})
