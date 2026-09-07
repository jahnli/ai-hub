import { useMemo } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'

import type { ModelSquareFormValues } from '../lib/schema'

type RecommendationFieldsProps = {
  index: number
  models: string[]
  disabled: boolean
  onRemove: () => void
}

export function RecommendationFields(props: RecommendationFieldsProps) {
  const { t } = useTranslation()
  const form = useFormContext<ModelSquareFormValues>()
  const prefix = `recommendations.${props.index}` as const
  const model = useWatch({
    control: form.control,
    name: `${prefix}.model_name`,
  })
  const unavailable = Boolean(model && !props.models.includes(model))
  const options = useMemo(() => {
    if (unavailable) return [model, ...props.models]
    return props.models
  }, [model, props.models, unavailable])
  const errors = form.formState.errors.recommendations?.[props.index]
  const scenarios = [
    { value: 'general', label: t('General recommendations') },
    { value: 'coding', label: t('Coding') },
    { value: 'chat', label: t('Daily chat') },
    { value: 'writing', label: t('Writing') },
    { value: 'image', label: t('Image generation') },
  ]

  return (
    <FieldSet
      className='min-w-0 rounded-lg border p-4'
      disabled={props.disabled}
    >
      <FieldLegend>
        {t('Recommendation {{number}}', { number: props.index + 1 })}
      </FieldLegend>
      <FieldGroup className='grid min-w-0 gap-4 md:grid-cols-2'>
        <Field data-invalid={Boolean(errors?.model_name)}>
          <FieldLabel htmlFor={`${prefix}.model_name`}>{t('Model')}</FieldLabel>
          <Controller
            control={form.control}
            name={`${prefix}.model_name`}
            render={({ field }) => (
              <Combobox
                items={options}
                value={field.value || null}
                disabled={props.disabled}
                onValueChange={(value) => field.onChange(value ?? '')}
              >
                <ComboboxInput
                  id={`${prefix}.model_name`}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  placeholder={t('Search models...')}
                  aria-invalid={Boolean(errors?.model_name)}
                  aria-describedby={
                    errors?.model_name ? `${prefix}.model-error` : undefined
                  }
                  className='w-full min-w-0'
                />
                <ComboboxContent>
                  <ComboboxEmpty>{t('No models found')}</ComboboxEmpty>
                  <ComboboxList>
                    {(option: string) => (
                      <ComboboxItem
                        key={option}
                        value={option}
                        className='break-all'
                      >
                        {option}
                        {!props.models.includes(option) &&
                          ` (${t('Unavailable')})`}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          {unavailable && (
            <FieldDescription>
              {t(
                'This saved model is currently unavailable. It will be retained until you replace or remove it.'
              )}
            </FieldDescription>
          )}
          <FieldError
            id={`${prefix}.model-error`}
            errors={[errors?.model_name]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${prefix}.scenario`}>
            {t('Scenario')}
          </FieldLabel>
          <NativeSelect
            id={`${prefix}.scenario`}
            className='w-full'
            {...form.register(`${prefix}.scenario`)}
          >
            {scenarios.map((scenario) => (
              <NativeSelectOption key={scenario.value} value={scenario.value}>
                {scenario.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={Boolean(errors?.priority)}>
          <FieldLabel htmlFor={`${prefix}.priority`}>
            {t('Priority')}
          </FieldLabel>
          <Input
            id={`${prefix}.priority`}
            type='number'
            min={0}
            max={9999}
            step={1}
            {...form.register(`${prefix}.priority`, { valueAsNumber: true })}
            aria-invalid={Boolean(errors?.priority)}
            aria-describedby={`${prefix}.priority-error`}
          />
          <FieldError
            id={`${prefix}.priority-error`}
            errors={[errors?.priority]}
          />
        </Field>
        <Field orientation='horizontal' className='self-end'>
          <Controller
            control={form.control}
            name={`${prefix}.enabled`}
            render={({ field }) => (
              <Switch
                id={`${prefix}.enabled`}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={props.disabled}
              />
            )}
          />
          <FieldLabel htmlFor={`${prefix}.enabled`}>{t('Enabled')}</FieldLabel>
        </Field>
      </FieldGroup>
      <Button
        type='button'
        variant='outline'
        className='self-start'
        onClick={props.onRemove}
        disabled={props.disabled}
        aria-label={t('Remove recommendation {{number}}', {
          number: props.index + 1,
        })}
      >
        {t('Remove')}
      </Button>
    </FieldSet>
  )
}
