import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

let subscriptionTotal = 1_000
const decreaseRequests: Array<{ subscriptionId: number; amount: number }> = []

vi.mock('sonner', () => ({
  toast: { error: () => undefined, success: () => undefined },
}))

vi.mock('../../../api', () => ({
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

vi.mock('@/components/confirm-dialog', () => ({
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

vi.mock('@/components/data-table', () => ({
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

vi.mock('@/components/drawer-layout', () => ({
  sideDrawerContentClassName: () => '',
  sideDrawerFormClassName: () => '',
  sideDrawerHeaderClassName: () => '',
}))

vi.mock('@/components/status-badge', () => ({
  StatusBadge: (props: { label: ReactNode }) => <span>{props.label}</span>,
}))

vi.mock('@/components/table-id', () => ({
  TableId: (props: { value: ReactNode }) => <span>{props.value}</span>,
}))

vi.mock('@/components/ui/button', () => ({
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

vi.mock('@/components/ui/dropdown-menu', () => ({
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props} />
  ),
}))

vi.mock('@/components/ui/select', () => ({
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

vi.mock('@/components/ui/sheet', () => ({
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

vi.mock('@/components/ui/switch', () => ({
  Switch: () => <input type='checkbox' />,
}))

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { UserSubscriptionsDialog } = await import('../user-subscriptions-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

async function renderDialog(): Promise<void> {
  render(
    <I18nextProvider i18n={i18n}>
      <UserSubscriptionsDialog
        open
        onOpenChange={() => undefined}
        user={{ id: 5, username: 'alice' }}
      />
    </I18nextProvider>
  )
  await screen.findByRole('button', { name: 'Decrease' })
}

afterEach(() => {
  decreaseRequests.length = 0
  subscriptionTotal = 1_000
})

describe('user subscription quota decrease', () => {
  test('submits the default CNY amount for an active finite subscription', async () => {
    await renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    const decreaseButtons = screen.getAllByRole('button', { name: 'Decrease' })
    const dialogConfirmButton = decreaseButtons.at(-1)
    if (!dialogConfirmButton) {
      throw new Error('Decrease confirmation button was not rendered')
    }
    fireEvent.click(dialogConfirmButton)

    await waitFor(() => {
      expect(decreaseRequests).toEqual([{ subscriptionId: 42, amount: 500 }])
    })
  })

  test('disables decrease for an unlimited subscription', async () => {
    subscriptionTotal = 0
    await renderDialog()

    const decreaseButton = screen.getByRole('button', { name: 'Decrease' })

    expect(decreaseButton).toBeDisabled()
  })
})
