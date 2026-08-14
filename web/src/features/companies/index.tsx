import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'

import {
  companyQueryKeys,
  getCompanies,
  testCompanyConnection,
  updateCompanyStatus,
} from './api'
import { CompaniesTable } from './components/companies-table'
import { CompanyMutateDialog } from './components/company-mutate-sheet'
import type { Company, CompanyStatus } from './types'

export function Companies() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [statusTarget, setStatusTarget] = useState<Company | null>(null)

  const connectionMutation = useMutation({
    mutationFn: async (company: Company) => {
      const response = await testCompanyConnection(company.id)
      if (!response.success || !response.data?.connected) {
        throw new Error(response.message || t('Connection test failed'))
      }
      return response.data
    },
    onSuccess: (result) => {
      if (result.name_matched === false) {
        toast.warning(
          t(
            'Connection succeeded, but the organization name does not match the company name.'
          )
        )
        return
      }
      toast.success(t('Connection test succeeded'))
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t('Connection test failed')
      )
    },
  })

  const companiesQuery = useQuery({
    queryKey: companyQueryKeys.all,
    queryFn: async () => {
      const response = await getCompanies()
      if (!response.success) {
        throw new Error(response.message || t('Failed to load companies'))
      }
      return response.data ?? []
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (input: { id: number; status: CompanyStatus }) => {
      const response = await updateCompanyStatus(input.id, input.status)
      if (!response.success) {
        throw new Error(response.message || t('Operation failed'))
      }
      return input.status
    },
    onSuccess: async (status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['department'] }),
      ])
      toast.success(
        status === 'enabled'
          ? t('Company enabled successfully')
          : t('Company disabled successfully')
      )
      setStatusTarget(null)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t('Operation failed')
      )
    },
  })

  const handleCreate = useCallback(() => {
    setEditingCompany(null)
    setEditorOpen(true)
  }, [])

  const handleEdit = useCallback((company: Company) => {
    setEditingCompany(company)
    setEditorOpen(true)
  }, [])

  const handleToggleStatus = useCallback((company: Company) => {
    setStatusTarget(company)
  }, [])

  const handleEditorOpenChange = useCallback((open: boolean) => {
    setEditorOpen(open)
    if (!open) setEditingCompany(null)
  }, [])

  const handleStatusConfirm = () => {
    if (!statusTarget) return
    const status: CompanyStatus =
      statusTarget.status === 'enabled' ? 'disabled' : 'enabled'
    statusMutation.mutate({ id: statusTarget.id, status })
  }

  const targetIsEnabled = statusTarget?.status === 'enabled'
  let statusTitle = t('Confirm enable')
  let statusDescription = t('Enable this company in Data Overview?')
  let statusConfirmText = t('Enable')
  if (targetIsEnabled) {
    statusTitle = t('Confirm disable')
    statusDescription = t(
      'Disable this company? Existing data is retained and it will be hidden from Data Overview.'
    )
    statusConfirmText = t('Disable')
  }

  return (
    <>
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>
          {t('Company Management')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button size='sm' onClick={handleCreate}>
            <Plus aria-hidden='true' />
            {t('Create Company')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          {companiesQuery.isError ? (
            <div className='flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center'>
              <p className='text-destructive text-sm'>
                {companiesQuery.error instanceof Error
                  ? companiesQuery.error.message
                  : t('Failed to load companies')}
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => companiesQuery.refetch()}
              >
                {t('Retry')}
              </Button>
            </div>
          ) : (
            <CompaniesTable
              companies={companiesQuery.data ?? []}
              isLoading={companiesQuery.isLoading}
              isFetching={companiesQuery.isFetching}
              onEdit={handleEdit}
              onTestConnection={(company) => connectionMutation.mutate(company)}
              testingCompanyId={
                connectionMutation.isPending
                  ? (connectionMutation.variables?.id ?? null)
                  : null
              }
              onToggleStatus={handleToggleStatus}
            />
          )}
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <CompanyMutateDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        company={editingCompany}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTitle}
        desc={statusDescription}
        confirmText={statusConfirmText}
        destructive={targetIsEnabled}
        handleConfirm={handleStatusConfirm}
        isLoading={statusMutation.isPending}
      />
    </>
  )
}
