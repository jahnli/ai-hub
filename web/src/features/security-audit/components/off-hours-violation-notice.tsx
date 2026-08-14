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
