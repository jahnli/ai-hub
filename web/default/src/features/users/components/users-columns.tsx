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
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { type User } from '../types'
import { DataTableRowActions } from './data-table-row-actions'
import { useSharedUserColumns } from './shared-user-columns'

export function useUsersColumns(): ColumnDef<User>[] {
  const { t } = useTranslation()

  const sharedColumns = useSharedUserColumns<User>({
    costAccessor: 'monthly_total_amount_cny',
    tokensAccessor: 'monthly_total_tokens',
    requestsAccessor: 'monthly_total_requests',
    modelAccessor: 'monthly_common_model',
    requestCountAccessor: 'monthly_total_requests',
    withGroupBadgeCell: true,
  })

  return useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all'
            className='translate-y-[2px]'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
            className='translate-y-[2px]'
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      } satisfies ColumnDef<User>,
      ...sharedColumns,
      {
        id: 'actions',
        header: () => t('Actions'),
        cell: ({ row }) => <DataTableRowActions row={row} />,
        meta: { pinned: 'right' as const },
      } satisfies ColumnDef<User>,
    ],
    [sharedColumns, t],
  )
}
