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
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { type User } from '../types'
import { DataTableRowActions } from './data-table-row-actions'
import {
  userIdColumn,
  userNameColumn,
  userQuotaColumn,
  userCostColumn,
  userTokensColumn,
  userRequestsColumn,
  userModelColumn,
  userDepartmentColumn,
  userJobLevelColumn,
  userJoinDateColumn,
  userLastLoginColumn,
  userCreatedAtColumn,
  userRoleColumn,
  userStatusColumn,
  userGroupColumn,
} from './shared-user-columns'

export function useUsersColumns(): ColumnDef<User>[] {
  const { t } = useTranslation()
  return [
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
    },
    userIdColumn<User>(t),
    userNameColumn<User>(t),
    userQuotaColumn<User>(t),
    userCostColumn<User>(t, { accessor: 'monthly_total_amount_cny' }),
    userTokensColumn<User>(t, { accessor: 'monthly_total_tokens' }),
    userRequestsColumn<User>(t, { accessor: 'monthly_total_requests' }),
    userModelColumn<User>(t, { accessor: 'monthly_common_model', variant: 'badge' }),
    userDepartmentColumn<User>(t),
    userJobLevelColumn<User>(t),
    userJoinDateColumn<User>(t),
    userLastLoginColumn<User>(t),
    userCreatedAtColumn<User>(t),
    {
      ...userRoleColumn<User>(t),
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
    },
    {
      ...userStatusColumn<User>(t, { showRequestCount: true, requestCountAccessor: 'monthly_total_requests' as keyof User }),
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
    },
    {
      ...userGroupColumn<User>(t, { withBadgeCell: true }),
      filterFn: (row, id, value) => {
        const group = String(row.getValue(id) || t('User Group')).toLowerCase()
        const searchValue = String(value).toLowerCase()
        return group.includes(searchValue)
      },
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      cell: ({ row }) => <DataTableRowActions row={row} />,
      meta: { pinned: 'right' as const },
    },
  ]
}
