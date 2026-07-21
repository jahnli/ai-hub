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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
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
        start_hour: z.number().int().min(0).max(23),
        end_hour: z.number().int().min(0).max(23),
      }),
    })
    .refine(
      (values) =>
        values.audit_setting.end_hour >= values.audit_setting.start_hour,
      {
        path: ['audit_setting', 'end_hour'],
        message: t('End time cannot be earlier than start time'),
      }
    )

type OffHoursAuditSetting = {
  enabled: boolean
  start_hour: number
  end_hour: number
}

type AuditFormValues = {
  audit_setting: OffHoursAuditSetting
}

type AuditSectionProps = {
  defaultValues: OffHoursAuditSetting
}

const parseAuditHour = (rawValue: string): number => {
  const parsedHour = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsedHour)) return 0
  return Math.min(23, Math.max(0, parsedHour))
}

const buildFormDefaults = (
  defaults: AuditSectionProps['defaultValues']
): AuditFormValues => ({
  audit_setting: { ...defaults },
})

export function AuditSection({ defaultValues }: AuditSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const auditSchema = createAuditSchema(t)
  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    mode: 'onChange',
    defaultValues: buildFormDefaults(defaultValues),
  })

  useEffect(() => {
    form.reset(buildFormDefaults(defaultValues))
  }, [defaultValues, form])

  const onSubmit = async (values: AuditFormValues) => {
    await updateOption.mutateAsync({
      key: 'audit_setting.off_hours',
      value: JSON.stringify(values.audit_setting),
    })
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
          <h3 className='text-sm font-semibold'>{t('Off-hours audit')}</h3>
          <div className='grid items-end gap-4 md:grid-cols-3'>
            <FormField
              control={form.control}
              name='audit_setting.enabled'
              render={({ field }) => (
                <SettingsSwitchItem className='h-8 py-0'>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable')}</FormLabel>
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
              name='audit_setting.start_hour'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Start time')}</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupInput
                        type='number'
                        min={0}
                        max={23}
                        step={1}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(event) =>
                          field.onChange(parseAuditHour(event.target.value))
                        }
                      />
                      <InputGroupAddon align='inline-end'>:00</InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='audit_setting.end_hour'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('End time')}</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupInput
                        type='number'
                        min={0}
                        max={23}
                        step={1}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(event) =>
                          field.onChange(parseAuditHour(event.target.value))
                        }
                      />
                      <InputGroupAddon align='inline-end'>:00</InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
