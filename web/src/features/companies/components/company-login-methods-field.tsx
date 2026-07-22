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
