import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { FormField } from '@/components/ui/form'

import {
  COMPANY_LOGIN_METHOD_OPTIONS,
  type CompanyFormValues,
} from '../lib/company-form'

export function CompanyLoginMethodsField() {
  const { t } = useTranslation()
  const form = useFormContext<CompanyFormValues>()

  return (
    <FormField
      control={form.control}
      name='login_methods'
      render={({ field, fieldState }) => (
        <FieldSet>
          <FieldLegend variant='label'>{t('Login Methods')}</FieldLegend>
          <FieldGroup className='gap-3'>
            {COMPANY_LOGIN_METHOD_OPTIONS.map((option) => {
              const checked = field.value.includes(option.value)
              const inputId = `company-login-method-${option.value}`
              return (
                <Field key={option.value} orientation='horizontal'>
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      if (nextChecked) {
                        field.onChange([...field.value, option.value])
                        return
                      }
                      field.onChange(
                        field.value.filter((value) => value !== option.value)
                      )
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor={inputId} className='font-normal'>
                    {t(option.labelKey)}
                  </FieldLabel>
                </Field>
              )
            })}
          </FieldGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  )
}
