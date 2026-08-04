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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const createAuditSchema = (t: (key: string) => string) =>
  z
    .object({
      offHours: z.object({
        enabled: z.boolean(),
        start_hour: z.number().int().min(0).max(23),
        end_hour: z.number().int().min(0).max(23),
      }),
      imageStudioEnabled: z.boolean(),
      autoSaveApiImageGeneration: z.boolean(),
      imageStudioDisplayHistoryLimit: z.number().int().min(1).max(1000),
      imageStudioStorageHistoryLimit: z.number().int().min(1).max(1000),
      requestContentEnabled: z.boolean(),
    })
    .refine(
      (values) => values.offHours.end_hour >= values.offHours.start_hour,
      {
        path: ['offHours', 'end_hour'],
        message: t('End time cannot be earlier than start time'),
      }
    )

type OffHoursAuditSetting = {
  enabled: boolean
  start_hour: number
  end_hour: number
}

type AuditFormValues = {
  offHours: OffHoursAuditSetting
  imageStudioEnabled: boolean
  autoSaveApiImageGeneration: boolean
  imageStudioDisplayHistoryLimit: number
  imageStudioStorageHistoryLimit: number
  requestContentEnabled: boolean
}

type AuditSectionProps = {
  defaultValues: {
    offHours: OffHoursAuditSetting
    imageStudioEnabled: boolean
    autoSaveApiImageGeneration: boolean
    imageStudioDisplayHistoryLimit: number
    imageStudioStorageHistoryLimit: number
    requestContentEnabled: boolean
  }
}

const parseAuditHour = (rawValue: string): number => {
  const parsedHour = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsedHour)) return 0
  return Math.min(23, Math.max(0, parsedHour))
}

const parseImageStudioLimit = (rawValue: string): number => {
  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed)) return 1
  return Math.min(1000, Math.max(1, parsed))
}

const buildFormDefaults = (
  defaults: AuditSectionProps['defaultValues']
): AuditFormValues => ({
  offHours: { ...defaults.offHours },
  imageStudioEnabled: defaults.imageStudioEnabled,
  autoSaveApiImageGeneration: defaults.autoSaveApiImageGeneration,
  imageStudioDisplayHistoryLimit: defaults.imageStudioDisplayHistoryLimit || 10,
  imageStudioStorageHistoryLimit: defaults.imageStudioStorageHistoryLimit || 10,
  requestContentEnabled: defaults.requestContentEnabled,
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
    await Promise.all([
      updateOption.mutateAsync({
        key: 'audit_setting.off_hours',
        value: JSON.stringify(values.offHours),
      }),
      updateOption.mutateAsync({
        key: 'audit_setting.image_studio',
        value: values.imageStudioEnabled,
      }),
      updateOption.mutateAsync({
        key: 'audit_setting.auto_save_api_image_generation',
        value: values.autoSaveApiImageGeneration,
      }),
      updateOption.mutateAsync({
        key: 'audit_setting.image_studio_display_history_limit',
        value: values.imageStudioDisplayHistoryLimit,
      }),
      updateOption.mutateAsync({
        key: 'audit_setting.image_studio_max_history',
        value: values.imageStudioStorageHistoryLimit,
      }),
      updateOption.mutateAsync({
        key: 'RecordRequestMessageEnabled',
        value: values.requestContentEnabled,
      }),
    ])
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
          <div className='grid gap-4 md:grid-cols-2'>
            <section
              aria-labelledby='off-hours-audit-title'
              data-audit-setting-card='off-hours'
              className='bg-card overflow-hidden rounded-2xl border shadow-sm'
            >
              <div className='flex items-center justify-between gap-6 p-5'>
                <div className='min-w-0 space-y-1'>
                  <h3
                    id='off-hours-audit-title'
                    className='text-base font-semibold'
                  >
                    {t('Off-hours audit')}
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {t('Enable auditing only during the configured time range')}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name='offHours.enabled'
                  render={({ field }) => (
                    <FormItem className='shrink-0 space-y-0'>
                      <FormLabel className='sr-only'>{t('Enable')}</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div
                data-audit-time-range
                className='bg-muted/35 grid gap-4 border-t p-5 sm:grid-cols-2'
              >
                <FormField
                  control={form.control}
                  name='offHours.start_hour'
                  render={({ field }) => (
                    <FormItem className='space-y-2'>
                      <FormLabel>{t('Start time')}</FormLabel>
                      <FormControl>
                        <InputGroup className='bg-background'>
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
                          <InputGroupAddon align='inline-end'>
                            :00
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='offHours.end_hour'
                  render={({ field }) => (
                    <FormItem className='space-y-2'>
                      <FormLabel>{t('End time')}</FormLabel>
                      <FormControl>
                        <InputGroup className='bg-background'>
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
                          <InputGroupAddon align='inline-end'>
                            :00
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <FormField
              control={form.control}
              name='requestContentEnabled'
              render={({ field }) => (
                <FormItem
                  data-audit-setting-card='request-content'
                  className='bg-card flex min-h-40 flex-col justify-between gap-6 rounded-2xl border p-5 shadow-sm'
                >
                  <SettingsSwitchContent className='space-y-2'>
                    <FormLabel className='text-base font-semibold'>
                      {t('Record request content')}
                    </FormLabel>
                    <FormDescription className='text-sm leading-relaxed'>
                      {t(
                        'Store the user prompts and model parameters of each relay request for auditing. Keeping this on increases database writes and storage usage.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <div className='flex items-center justify-between border-t pt-4'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('Enable')}
                    </span>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='imageStudioEnabled'
              render={({ field }) => (
                <FormItem
                  data-audit-setting-card='image-audit'
                  className='bg-card flex min-h-40 flex-col justify-between gap-6 rounded-2xl border p-5 shadow-sm'
                >
                  <SettingsSwitchContent className='space-y-2'>
                    <FormLabel className='text-base font-semibold'>
                      {t('Image audit')}
                    </FormLabel>
                    <FormDescription className='text-sm leading-relaxed'>
                      {t(
                        'Audit image generation requests and generated content'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <div className='flex items-center justify-between border-t pt-4'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('Enable')}
                    </span>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='autoSaveApiImageGeneration'
              render={({ field }) => (
                <FormItem
                  data-audit-setting-card='auto-save-api-image'
                  className='bg-card flex min-h-40 flex-col justify-between gap-6 rounded-2xl border p-5 shadow-sm'
                >
                  <SettingsSwitchContent className='space-y-2'>
                    <FormLabel className='text-base font-semibold'>
                      {t('Auto-save API image generations')}
                    </FormLabel>
                    <FormDescription className='text-sm leading-relaxed'>
                      {t(
                        'Also record images generated through the raw API (not just the Image Studio) into the image studio history. This downloads and stores each generated image, increasing storage usage.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <div className='flex items-center justify-between border-t pt-4'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('Enable')}
                    </span>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='imageStudioDisplayHistoryLimit'
              render={({ field }) => (
                <FormItem
                  data-audit-setting-card='image-studio-display-history-limit'
                  className='bg-card flex min-h-40 flex-col justify-between gap-6 rounded-2xl border p-5 shadow-sm'
                >
                  <SettingsSwitchContent className='space-y-2'>
                    <FormLabel className='text-base font-semibold'>
                      {t('Image studio display limit')}
                    </FormLabel>
                    <FormDescription className='text-sm leading-relaxed'>
                      {t(
                        'Maximum number of recent image generations shown in Image Studio per user. Removing them from Image Studio does not delete stored records or images.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <div className='flex items-center justify-between border-t pt-4'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('Displayed records')}
                    </span>
                    <FormControl>
                      <InputGroup className='bg-background w-32'>
                        <InputGroupInput
                          type='number'
                          min={1}
                          max={1000}
                          step={1}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(event) =>
                            field.onChange(
                              parseImageStudioLimit(event.target.value)
                            )
                          }
                        />
                      </InputGroup>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='imageStudioStorageHistoryLimit'
              render={({ field }) => (
                <FormItem
                  data-audit-setting-card='image-studio-storage-history-limit'
                  className='bg-card flex min-h-40 flex-col justify-between gap-6 rounded-2xl border p-5 shadow-sm'
                >
                  <SettingsSwitchContent className='space-y-2'>
                    <FormLabel className='text-base font-semibold'>
                      {t('Image studio storage limit')}
                    </FormLabel>
                    <FormDescription className='text-sm leading-relaxed'>
                      {t(
                        'Maximum number of image generations stored per user. Older records beyond this limit are permanently deleted along with their stored images.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <div className='flex items-center justify-between border-t pt-4'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('Stored records')}
                    </span>
                    <FormControl>
                      <InputGroup className='bg-background w-32'>
                        <InputGroupInput
                          type='number'
                          min={1}
                          max={1000}
                          step={1}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(event) =>
                            field.onChange(
                              parseImageStudioLimit(event.target.value)
                            )
                          }
                        />
                      </InputGroup>
                    </FormControl>
                  </div>
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
