import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

const navigate = vi.fn()
const goBack = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouter: () => ({ history: { go: goBack } }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { feishu_support_open_id: 'ou_support' },
    loading: false,
    error: null,
  }),
}))

const { GeneralError } = await import('../general-error')

describe('general error support contact', () => {
  test('shows the shared Feishu contact instead of GitHub issue feedback', () => {
    render(<GeneralError />)

    const supportLink = screen.getByRole('link', {
      name: /Having issues\? Chat on Feishu/,
    })

    expect(supportLink).toHaveAttribute(
      'href',
      'https://applink.feishu.cn/client/chat/open?openId=ou_support'
    )
    expect(
      screen.queryByText(
        'If this keeps happening, please report it on GitHub Issues.'
      )
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Report an issue' })
    ).not.toBeInTheDocument()
  })
})
