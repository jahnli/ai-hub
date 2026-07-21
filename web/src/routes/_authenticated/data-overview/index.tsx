import { createFileRoute, redirect } from '@tanstack/react-router'

import { DataOverview } from '@/features/data-overview'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/data-overview/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (
      !auth.user ||
      (auth.user.role < ROLE.BU_BP && !auth.user.is_dept_leader)
    ) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: DataOverview,
})
