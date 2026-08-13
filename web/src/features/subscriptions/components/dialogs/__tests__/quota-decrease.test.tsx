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
import { afterEach, describe, expect, mock, test } from 'bun:test'

import { Window } from 'happy-dom'
import type { ReactNode } from 'react'

const domWindow = new Window()
for (const globalName of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'MouseEvent',
  'MutationObserver',
] as const) {
  Object.defineProperty(globalThis, globalName, {
    configurable: true,
    value: domWindow[globalName],
  })
}

let subscriptionTotal = 1_000
const decreaseRequests: Array<{ subscriptionId: number; amount: number }> = []

mock.module('sonner', () => ({
  toast: { error: () => undefined, success: () => undefined },
}))

mock.module('../../../api', () => ({
  createUserSubscription: async () => ({ success: true }),
  decreaseUserSubscriptionQuota: async (
    subscriptionId: number,
    amount: number
  ) => {
    decreaseRequests.push({ subscriptionId, amount })
    return { success: true, data: { quota_delta: amount } }
  },
  deleteUserSubscription: async () => ({ success: true }),
  getAdminPlans: async () => ({
    success: true,
    data: [{ plan: { id: 7, title: 'Team', total_amount: 1_000 } }],
  }),
  getUserSubscriptions: async () => ({
    success: true,
    data: [
      {
        subscription: {
          id: 42,
          user_id: 5,
          plan_id: 7,
          status: 'active',
          source: 'admin',
          start_time: 1,
          end_time: Date.now() / 1000 + 3_600,
          amount_total: subscriptionTotal,
          amount_used: 100,
        },
      },
    ],
  }),
  increaseUserSubscriptionQuota: async () => ({ success: true }),
  invalidateUserSubscription: async () => ({ success: true }),
  resetUserSubscriptionsByPlan: async () => ({ success: true }),
}))

mock.module('@/components/confirm-dialog', () => ({
  ConfirmDialog: (props: {
    title: ReactNode
    desc: ReactNode
    children?: ReactNode
    confirmText?: ReactNode
    handleConfirm: () => void
  }) => (
    <section role='dialog'>
      <h2>{props.title}</h2>
      <div>{props.desc}</div>
      {props.children}
      <button type='button' onClick={props.handleConfirm}>
        {props.confirmText}
      </button>
    </section>
  ),
}))

mock.module('@/components/data-table', () => ({
  DataTableRowActionMenu: (props: { children: ReactNode }) => (
    <div>{props.children}</div>
  ),
  StaticDataTable: (props: {
    data: Array<{ subscription: { id: number } }>
    columns: Array<{
      id: string
      cell: (record: { subscription: { id: number } }) => ReactNode
    }>
  }) => (
    <div>
      {props.data.map((record) => (
        <div key={record.subscription.id}>
          {props.columns.map((column) => (
            <div key={column.id}>{column.cell(record)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}))

mock.module('@/components/drawer-layout', () => ({
  sideDrawerContentClassName: () => '',
  sideDrawerFormClassName: () => '',
  sideDrawerHeaderClassName: () => '',
}))

mock.module('@/components/status-badge', () => ({
  StatusBadge: (props: { label: ReactNode }) => <span>{props.label}</span>,
}))

mock.module('@/components/table-id', () => ({
  TableId: (props: { value: ReactNode }) => <span>{props.value}</span>,
}))

mock.module('@/components/ui/button', () => ({
  Button: (props: {
    children: ReactNode
    disabled?: boolean
    onClick?: () => void
  }) => (
    <button type='button' disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  ),
}))

mock.module('@/components/ui/dropdown-menu', () => ({
  DropdownMenuItem: (props: {
    children: ReactNode
    disabled?: boolean
    onClick?: () => void
  }) => (
    <button type='button' disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuShortcut: (props: { children: ReactNode }) => (
    <span>{props.children}</span>
  ),
}))

mock.module('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}))

mock.module('@/components/ui/label', () => ({
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props} />
  ),
}))

mock.module('@/components/ui/select', () => ({
  Select: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectContent: (props: { children: ReactNode }) => (
    <div>{props.children}</div>
  ),
  SelectGroup: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectItem: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SelectTrigger: (props: { children: ReactNode }) => (
    <button type='button'>{props.children}</button>
  ),
  SelectValue: (props: { placeholder?: ReactNode }) => (
    <span>{props.placeholder}</span>
  ),
}))

mock.module('@/components/ui/sheet', () => ({
  Sheet: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SheetContent: (props: { children: ReactNode }) => <div>{props.children}</div>,
  SheetDescription: (props: { children: ReactNode }) => (
    <div>{props.children}</div>
  ),
  SheetHeader: (props: { children: ReactNode }) => (
    <header>{props.children}</header>
  ),
  SheetTitle: (props: { children: ReactNode }) => <h1>{props.children}</h1>,
}))

mock.module('@/components/ui/switch', () => ({
  Switch: () => <input type='checkbox' />,
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { UserSubscriptionsDialog } = await import('../user-subscriptions-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

let renderedRoot: ReturnType<typeof createRoot> | null = null

async function waitForButton(label: string): Promise<HTMLButtonElement> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === label
    )
    if (button) return button
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error(`Button not found: ${label}`)
}

async function renderDialog(): Promise<void> {
  const host = document.createElement('div')
  document.body.append(host)
  renderedRoot = createRoot(host)
  await act(async () => {
    renderedRoot?.render(
      <I18nextProvider i18n={i18n}>
        <UserSubscriptionsDialog
          open
          onOpenChange={() => undefined}
          user={{ id: 5, username: 'alice' }}
        />
      </I18nextProvider>
    )
  })
  await act(async () => {
    await waitForButton('Decrease')
  })
}

afterEach(async () => {
  if (renderedRoot) {
    await act(async () => renderedRoot?.unmount())
  }
  renderedRoot = null
  document.body.replaceChildren()
  decreaseRequests.length = 0
  subscriptionTotal = 1_000
})

describe('user subscription quota decrease', () => {
  test('submits the default CNY amount for an active finite subscription', async () => {
    await renderDialog()
    const decreaseButton = await waitForButton('Decrease')

    await act(async () => decreaseButton.click())
    const confirmButton = await waitForButton('Decrease')
    const decreaseButtons = [...document.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Decrease'
    )
    const dialogConfirmButton = decreaseButtons.at(-1) || confirmButton
    await act(async () => dialogConfirmButton.click())

    expect(decreaseRequests).toEqual([{ subscriptionId: 42, amount: 500 }])
  })

  test('disables decrease for an unlimited subscription', async () => {
    subscriptionTotal = 0
    await renderDialog()

    const decreaseButton = await waitForButton('Decrease')

    expect(decreaseButton.disabled).toBe(true)
  })
})
