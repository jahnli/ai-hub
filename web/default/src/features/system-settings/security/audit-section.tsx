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
import { useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const createAuditSchema = (t: (key: string) => string) =>
  z
    .object({
      audit_setting: z.object({
        enabled: z.boolean(),
        off_hours_start_hour: z.number().int().min(0).max(23),
        off_hours_end_hour: z.number().int().min(0).max(23),
      }),
    })
    .refine(
      (v) =>
        v.audit_setting.off_hours_start_hour !==
        v.audit_setting.off_hours_end_hour,
      {
        path: ['audit_setting', 'off_hours_end_hour'],
        message: t('Start and end hour cannot be the same'),
      }
    )

type AuditFormValues = z.output<ReturnType<typeof createAuditSchema>>
type AuditFormInput = z.input<ReturnType<typeof createAuditSchema>>

type NormalizedAuditValues = {
  'audit_setting.enabled': boolean
  'audit_setting.off_hours_start_hour': number
  'audit_setting.off_hours_end_hour': number
}

type AuditSectionProps = {
  defaultValues: NormalizedAuditValues
}

const buildFormDefaults = (
  defaults: AuditSectionProps['defaultValues']
): AuditFormInput => ({
  audit_setting: {
    enabled: defaults['audit_setting.enabled'],
    off_hours_start_hour: defaults['audit_setting.off_hours_start_hour'],
    off_hours_end_hour: defaults['audit_setting.off_hours_end_hour'],
  },
})

const normalizeFormValues = (
  values: AuditFormValues
): NormalizedAuditValues => ({
  'audit_setting.enabled': values.audit_setting.enabled,
  'audit_setting.off_hours_start_hour':
    values.audit_setting.off_hours_start_hour,
  'audit_setting.off_hours_end_hour': values.audit_setting.off_hours_end_hour,
})

export function AuditSection({ defaultValues }: AuditSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const auditSchema = createAuditSchema(t)
  const form = useForm<AuditFormInput, unknown, AuditFormValues>({
    resolver: zodResolver(auditSchema),
    mode: 'onChange',
    defaultValues: buildFormDefaults(defaultValues),
  })

  useEffect(() => {
    form.reset(buildFormDefaults(defaultValues))
  }, [defaultValues, form])

  const onSubmit = async (values: AuditFormValues) => {
    const normalized = normalizeFormValues(values)
    for (const key of Object.keys(normalized) as Array<
      keyof NormalizedAuditValues
    >) {
      if (normalized[key] !== defaultValues[key]) {
        await updateOption.mutateAsync({ key, value: normalized[key] })
      }
    }
  }

  const parseHour = (raw: string): number => {
    const parsed = Number.parseInt(raw)
    if (Number.isNaN(parsed)) return 0
    return Math.min(23, Math.max(0, parsed))
  }

  return (
    <SettingsSection title={t('Security Audit')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            saveLabel='Save audit settings'
          />
          <FormField
            control={form.control}
            name='audit_setting.enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable security audit')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Aggregates consumption requests made during the audit window from usage logs. No extra data is stored; changing the window applies to history immediately.'
                    )}
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

          <div className='grid gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='audit_setting.off_hours_start_hour'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Audit window start hour')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      max={23}
                      step={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseHour(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {t('0-23, in the server local timezone. Default 3.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='audit_setting.off_hours_end_hour'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Audit window end hour')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      max={23}
                      step={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseHour(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Default 7. An end hour not later than the start hour means the window crosses midnight (e.g. 22-6) and is attributed to the starting day.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormDescription>
            {t(
              'The IP column depends on per-user IP logging; users who disabled it will show no IP.'
            )}
          </FormDescription>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
