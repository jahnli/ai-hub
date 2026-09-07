import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/model-square-settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/system-settings/model-square', replace: true })
  },
})
