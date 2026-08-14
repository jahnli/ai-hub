import { createFileRoute, redirect } from '@tanstack/react-router'

import { SECURITY_AUDIT_DEFAULT_SECTION } from '@/features/security-audit/section-registry'

export const Route = createFileRoute('/_authenticated/security-audit/')({
  beforeLoad: () => {
    throw redirect({
      to: '/security-audit/$section',
      params: { section: SECURITY_AUDIT_DEFAULT_SECTION },
    })
  },
})
