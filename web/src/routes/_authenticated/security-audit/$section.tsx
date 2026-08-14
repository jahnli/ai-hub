import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'

import { SecurityAudit } from '@/features/security-audit'
import {
  isSecurityAuditSectionId,
  SECURITY_AUDIT_DEFAULT_SECTION,
} from '@/features/security-audit/section-registry'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

const securityAuditSearchSchema = z.object({
  offHoursPage: z.number().optional().catch(1),
  offHoursPageSize: z.number().optional().catch(undefined),
  imageAuditPage: z.number().optional().catch(1),
  imageAuditPageSize: z.number().optional().catch(undefined),
  username: z.string().optional().catch(''),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
})

export const Route = createFileRoute('/_authenticated/security-audit/$section')(
  {
    beforeLoad: ({ params }) => {
      const { auth } = useAuthStore.getState()

      if (!auth.user || auth.user.role < ROLE.SUPER_ADMIN) {
        throw redirect({
          to: '/403',
        })
      }
      if (!isSecurityAuditSectionId(params.section)) {
        throw redirect({
          to: '/security-audit/$section',
          params: { section: SECURITY_AUDIT_DEFAULT_SECTION },
        })
      }
    },
    validateSearch: securityAuditSearchSchema,
    component: SecurityAudit,
  }
)
