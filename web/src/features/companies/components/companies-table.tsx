import type { ColumnDef } from '@tanstack/react-table'
import { Cable, Pencil, Power, PowerOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DISABLED_ROW_DESKTOP,
  DISABLED_ROW_MOBILE,
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import { StatusBadge, StatusBadgeList } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  COMPANY_LOGIN_METHOD_OPTIONS,
  COMPANY_PLATFORM_OPTIONS,
  getCompanyRowActions,
} from '../lib/company-form'
import type { Company } from '../types'

type CompaniesTableProps = {
  companies: Company[]
  isLoading: boolean
  isFetching: boolean
  onEdit: (company: Company) => void
  onTestConnection: (company: Company) => void
  testingCompanyId: number | null
  onToggleStatus: (company: Company) => void
}

export function CompaniesTable(props: CompaniesTableProps) {
  const { t } = useTranslation()
  const [globalFilter, setGlobalFilter] = useState('')
  const onEdit = props.onEdit
  const onTestConnection = props.onTestConnection
  const onToggleStatus = props.onToggleStatus

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('ID'),
        meta: { mobileHidden: true },
        cell: ({ row }) => <TableId value={row.original.id} />,
        size: 60,
      },
      {
        accessorKey: 'name',
        header: t('Company Name'),
        meta: { mobileTitle: true },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-medium'>{row.original.name}</div>
            <div className='text-muted-foreground truncate text-xs'>
              {row.original.alias}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: 'platform',
        header: t('Platform'),
        cell: ({ row }) => {
          const option = COMPANY_PLATFORM_OPTIONS.find(
            (item) => item.value === row.original.platform
          )
          return (
            <StatusBadge
              label={option ? t(option.labelKey) : row.original.platform}
              variant='neutral'
              copyable={false}
            />
          )
        },
        size: 110,
      },
      {
        accessorKey: 'login_methods',
        header: t('Login Methods'),
        meta: { mobileHidden: true },
        cell: ({ row }) => (
          <StatusBadgeList
            items={row.original.login_methods}
            getKey={(method) => method}
            renderItem={(method) => {
              const option = COMPANY_LOGIN_METHOD_OPTIONS.find(
                (item) => item.value === method
              )
              return (
                <StatusBadge
                  label={option ? t(option.labelKey) : method}
                  variant='neutral'
                  copyable={false}
                />
              )
            }}
          />
        ),
        size: 220,
      },
      {
        accessorKey: 'sort_order',
        header: t('Sort Order'),
        meta: { mobileHidden: true },
        size: 100,
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        meta: { mobileBadge: true },
        cell: ({ row }) => (
          <StatusBadge
            label={
              row.original.status === 'enabled' ? t('Enabled') : t('Disabled')
            }
            variant={row.original.status === 'enabled' ? 'success' : 'neutral'}
            copyable={false}
          />
        ),
        size: 90,
      },
      {
        id: 'actions',
        header: t('Actions'),
        meta: { pinned: 'right' as const },
        cell: ({ row }) => {
          const actions = getCompanyRowActions(row.original)
          const toggleAction = actions.find(
            (action) => action.id === 'toggle-status'
          )
          const testAction = actions.find(
            (action) => action.id === 'test-connection'
          )
          const isEnabled = row.original.status === 'enabled'
          return (
            <div className='-ml-1.5 flex items-center gap-1'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => onEdit(row.original)}
                      aria-label={t('Edit')}
                    />
                  }
                >
                  <Pencil aria-hidden='true' />
                </TooltipTrigger>
                <TooltipContent>{t('Edit')}</TooltipContent>
              </Tooltip>
              {testAction ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        disabled={props.testingCompanyId === row.original.id}
                        onClick={() => onTestConnection(row.original)}
                        aria-label={t(testAction.labelKey)}
                      />
                    }
                  >
                    <Cable aria-hidden='true' />
                  </TooltipTrigger>
                  <TooltipContent>{t(testAction.labelKey)}</TooltipContent>
                </Tooltip>
              ) : null}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => onToggleStatus(row.original)}
                      aria-label={t(toggleAction?.labelKey ?? 'Enable')}
                    />
                  }
                >
                  {isEnabled ? (
                    <PowerOff aria-hidden='true' />
                  ) : (
                    <Power aria-hidden='true' />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {t(toggleAction?.labelKey ?? 'Enable')}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
    ],
    [onEdit, onTestConnection, onToggleStatus, props.testingCompanyId, t]
  )

  const { table } = useDataTable({
    data: props.companies,
    columns,
    globalFilter,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).trim().toLowerCase()
      return [
        row.original.name,
        row.original.alias,
        row.original.platform,
      ].some((value) => value.toLowerCase().includes(search))
    },
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={props.isLoading}
      isFetching={props.isFetching}
      emptyTitle={t('No companies found')}
      emptyDescription={t('Create a company to configure its login platform.')}
      skeletonKeyPrefix='companies-skeleton'
      applyHeaderSize
      toolbarProps={{ searchPlaceholder: t('Search companies...') }}
      getRowClassName={(row, context) => {
        if (row.original.status === 'enabled') return undefined
        return context.isMobile ? DISABLED_ROW_MOBILE : DISABLED_ROW_DESKTOP
      }}
    />
  )
}
