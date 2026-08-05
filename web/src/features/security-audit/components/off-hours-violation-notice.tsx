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
import { useMutation } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

import { notifyOffHoursViolation } from '../api'
import type { OffHoursDetailTarget } from '../types'

export function OffHoursViolationNoticeButton(props: {
  target: OffHoursDetailTarget
}) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const notifyViolationMutation = useMutation({
    mutationFn: async () => {
      const response = await notifyOffHoursViolation({
        user_id: props.target.userId,
        start_time: props.target.requestStart,
        end_time: props.target.requestEnd,
        request_count: props.target.requestCount,
      })
      if (!response.success) {
        throw new Error(
          response.message || t('Failed to send violation notice')
        )
      }
      return response
    },
    onSuccess: () => {
      toast.success(t('Violation notice sent'))
      setConfirmOpen(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to send violation notice')
      )
    },
  })

  return (
    <>
      <Button
        variant='destructive'
        size='sm'
        className='h-7 gap-1.5 px-2 text-xs'
        onClick={() => setConfirmOpen(true)}
        disabled={notifyViolationMutation.isPending}
      >
        <ShieldAlert className='size-3.5' />
        {t('Violation Notice')}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Confirm Violation Notice')}
        desc={t('Send a violation notice to this user via Feishu?')}
        confirmText={t('Send')}
        destructive
        isLoading={notifyViolationMutation.isPending}
        handleConfirm={() => notifyViolationMutation.mutate()}
      />
    </>
  )
}
