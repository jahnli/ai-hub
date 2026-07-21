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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'

import { subscribeAllUsers } from '../../api'
import { useSubscriptions } from '../subscriptions-provider'

export function SubscribeAllDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, triggerRefresh } = useSubscriptions()
  const [loading, setLoading] = useState(false)

  if (open !== 'subscribe-all' || !currentRow) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await subscribeAllUsers(currentRow.plan.id)
      if (res.success) {
        const result = res.data ?? { created: 0, skipped: 0, failed: 0 }
        toast.success(
          t(
            'Subscribe all users completed: created {{created}}, skipped {{skipped}}, failed {{failed}}',
            result
          )
        )
        triggerRefresh()
        setOpen(null)
      }
    } catch {
      toast.error(t('Operation failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(v) => !v && setOpen(null)}
      title={t('Subscribe all users')}
      desc={t(
        'This will subscribe all enabled users to {{plan}}. Disabled and deleted users will be excluded. Continue?',
        { plan: currentRow.plan.title }
      )}
      handleConfirm={handleConfirm}
      isLoading={loading}
      confirmText={t('Confirm subscribe all users')}
    />
  )
}
