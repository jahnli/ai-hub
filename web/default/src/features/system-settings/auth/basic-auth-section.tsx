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
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getAdminPlans } from '@/features/subscriptions/api'
import type { PlanRecord } from '@/features/subscriptions/types'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useResetForm } from '../hooks/use-reset-form'
import { useUpdateOption } from '../hooks/use-update-option'

const basicAuthSchema = z.object({
  PasswordLoginEnabled: z.boolean(),
  PasswordRegisterEnabled: z.boolean(),
  EmailVerificationEnabled: z.boolean(),
  RegisterEnabled: z.boolean(),
  EmailDomainRestrictionEnabled: z.boolean(),
  EmailAliasRestrictionEnabled: z.boolean(),
  EmailDomainWhitelist: z.string(),
  registration: z.object({
    auto_subscribe_plan_id: z.number(),
  }),
})

type BasicAuthFormValues = z.infer<typeof basicAuthSchema>

type BasicAuthDefaults = Omit<BasicAuthFormValues, 'registration'> & {
  'registration.auto_subscribe_plan_id': number
}

type BasicAuthSectionProps = {
  defaultValues: BasicAuthDefaults
}

export function BasicAuthSection({ defaultValues }: BasicAuthSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [plans, setPlans] = useState<PlanRecord[]>([])

  const formDefaults = useMemo<BasicAuthFormValues>(
    () => ({
      PasswordLoginEnabled: defaultValues.PasswordLoginEnabled,
      PasswordRegisterEnabled: defaultValues.PasswordRegisterEnabled,
      EmailVerificationEnabled: defaultValues.EmailVerificationEnabled,
      RegisterEnabled: defaultValues.RegisterEnabled,
      EmailDomainRestrictionEnabled: defaultValues.EmailDomainRestrictionEnabled,
      EmailAliasRestrictionEnabled: defaultValues.EmailAliasRestrictionEnabled,
      EmailDomainWhitelist: defaultValues.EmailDomainWhitelist.split(',')
        .map((domain) => domain.trim())
        .filter(Boolean)
        .join('\n'),
      registration: {
        auto_subscribe_plan_id:
          defaultValues['registration.auto_subscribe_plan_id'] || 0,
      },
    }),
    [defaultValues]
  )

  const planTitleById = useMemo(() => {
    const nextPlanTitleById = new Map<number, string>()
    plans.forEach((item) => {
      nextPlanTitleById.set(item.plan.id, item.plan.title)
    })
    return nextPlanTitleById
  }, [plans])

  useEffect(() => {
    let mounted = true

    const loadPlans = async () => {
      try {
        const res = await getAdminPlans()
        if (mounted && res.success) {
          setPlans(res.data ?? [])
        }
      } catch {
        if (mounted) {
          setPlans([])
        }
      }
    }

    loadPlans()

    return () => {
      mounted = false
    }
  }, [])

  const form = useForm<BasicAuthFormValues>({
    resolver: zodResolver(basicAuthSchema),
    defaultValues: formDefaults,
  })

  useResetForm(form, formDefaults)

  const onSubmit = async (data: BasicAuthFormValues) => {
    const updates: Array<{ key: string; value: string | number | boolean }> = []
    const domains = data.EmailDomainWhitelist.split('\n')
      .map((domain) => domain.trim())
      .filter(Boolean)
      .join(',')
    const normalized = {
      PasswordLoginEnabled: data.PasswordLoginEnabled,
      PasswordRegisterEnabled: data.PasswordRegisterEnabled,
      EmailVerificationEnabled: data.EmailVerificationEnabled,
      RegisterEnabled: data.RegisterEnabled,
      EmailDomainRestrictionEnabled: data.EmailDomainRestrictionEnabled,
      EmailAliasRestrictionEnabled: data.EmailAliasRestrictionEnabled,
      EmailDomainWhitelist: domains,
      'registration.auto_subscribe_plan_id':
        data.registration.auto_subscribe_plan_id,
    }

    Object.entries(normalized).forEach(([key, value]) => {
      if (value !== defaultValues[key as keyof BasicAuthDefaults]) {
        updates.push({ key, value })
      }
    })

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  return (
    <SettingsSection title={t('Basic Authentication')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
          />
          <FormField
            control={form.control}
            name='PasswordLoginEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Password Login')}</FormLabel>
                  <FormDescription>
                    {t('Allow users to log in with password')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='RegisterEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Registration Enabled')}</FormLabel>
                  <FormDescription>
                    {t('Allow new users to register')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='PasswordRegisterEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Password Registration')}</FormLabel>
                  <FormDescription>
                    {t('Allow registration with password')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='registration.auto_subscribe_plan_id'
            render={({ field }) => {
              const selectedPlanLabel = field.value
                ? planTitleById.get(field.value) || t('Loading')
                : t('No auto-subscription')

              return (
                <FormItem>
                  <FormLabel>
                    {t('Auto-subscribe plan after registration')}
                  </FormLabel>
                  <Select
                    value={String(field.value || 0)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <span className='line-clamp-1 flex min-w-0 items-center text-left'>
                          {selectedPlanLabel}
                        </span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='0'>
                        {t('No auto-subscription')}
                      </SelectItem>
                      {plans.map((item) => (
                        <SelectItem
                          key={item.plan.id}
                          value={String(item.plan.id)}
                        >
                          {item.plan.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(
                      'Automatically bind this subscription plan to newly registered password accounts'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <FormField
            control={form.control}
            name='EmailVerificationEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Email Verification')}</FormLabel>
                  <FormDescription>
                    {t('Require email verification for new accounts')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='EmailDomainRestrictionEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Email Domain Restriction')}</FormLabel>
                  <FormDescription>
                    {t('Only allow specific email domains')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='EmailAliasRestrictionEnabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Email Alias Restriction')}</FormLabel>
                  <FormDescription>
                    {t('Block email aliases (e.g., user+alias@domain.com)')}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='EmailDomainWhitelist'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email Domain Whitelist')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('example.com&#10;company.com')}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'One domain per line (only used when domain restriction is enabled)'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
