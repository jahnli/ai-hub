import { createFileRoute, redirect } from '@tanstack/react-router'

import { DataOverview } from '@/features/data-overview'
import { canAccessDataOverview } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/data-overview/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (!canAccessDataOverview(auth.user)) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: DataOverview,
})
