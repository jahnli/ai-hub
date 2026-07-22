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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

import { companyQueryKeys, createCompany, updateCompany } from '../api'
import {
  COMPANY_FORM_DEFAULTS,
  COMPANY_PLATFORM_OPTIONS,
  companyToFormValues,
  getCompanyFormSchema,
  type CompanyFormValues,
} from '../lib/company-form'
import type { Company } from '../types'
import { CompanyCredentialsFields } from './company-credentials-fields'
import { CompanyLoginMethodsField } from './company-login-methods-field'

type CompanyMutateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
}

export function CompanyMutateDialog(props: CompanyMutateDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = props.company !== null
  const schema = getCompanyFormSchema(t)
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(schema) as Resolver<CompanyFormValues>,
    defaultValues: COMPANY_FORM_DEFAULTS,
  })

  useEffect(() => {
    if (!props.open) return
    form.reset(
      props.company ? companyToFormValues(props.company) : COMPANY_FORM_DEFAULTS
    )
  }, [form, props.company, props.open])

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const response = props.company
        ? await updateCompany(props.company.id, values)
        : await createCompany(values)
      if (!response.success) {
        throw new Error(response.message || t('Request failed'))
      }
      return response
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['department'] }),
      ])
      toast.success(
        isEdit
          ? t('Company updated successfully')
          : t('Company created successfully')
      )
      props.onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('Request failed'))
    },
  })

  const platform = form.watch('platform')
  const platformItems = COMPANY_PLATFORM_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }))

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={isEdit ? t('Edit Company') : t('Create Company')}
      description={t(
        'The company name is also used as the root department name and must match users.company.'
      )}
      contentClassName='sm:max-w-3xl'
      contentHeight='min(70vh, 44rem)'
      bodyClassName='py-0'
      footer={
        <>
          <DialogClose render={<Button variant='outline' />}>
            {t('Cancel')}
          </DialogClose>
          <Button
            form='company-form'
            type='submit'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Spinner data-icon='inline-start' /> : null}
            {mutation.isPending ? t('Saving...') : t('Save changes')}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id='company-form'
          className='flex flex-col gap-6'
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <SideDrawerSection>
            <SideDrawerSectionHeader
              title={t('Company Information')}
              description={t(
                'Configure the company identity and display order.'
              )}
            />
            <FieldGroup>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Company Name')}</FormLabel>
                    <FormControl>
                      <Input autoComplete='organization' {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('Must be unique and exactly match users.company.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='alias'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Company Alias')}</FormLabel>
                    <FormControl>
                      <Input autoComplete='off' {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('Displayed in Data Overview.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='sort_order'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Sort Order')}</FormLabel>
                    <FormControl>
                      <Input type='number' inputMode='numeric' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className={sideDrawerSwitchItemClassName()}>
                    <div>
                      <FormLabel>{t('Enabled')}</FormLabel>
                      <FormDescription>
                        {t('Disabled companies are hidden from Data Overview.')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'enabled'}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? 'enabled' : 'disabled')
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </FieldGroup>
          </SideDrawerSection>

          <SideDrawerSection>
            <SideDrawerSectionHeader
              title={t('Login Configuration')}
              description={t(
                'Record the login methods used by this company. Existing login behavior is unchanged.'
              )}
            />
            <FormField
              control={form.control}
              name='platform'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Platform')}</FormLabel>
                  <Select
                    items={platformItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {platformItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CompanyLoginMethodsField />
          </SideDrawerSection>

          <SideDrawerSection>
            <SideDrawerSectionHeader title={t('Platform Credentials')} />
            <CompanyCredentialsFields platform={platform} />
          </SideDrawerSection>
        </form>
      </Form>
    </Dialog>
  )
}
