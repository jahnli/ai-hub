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

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FieldGroup } from '@/components/ui/field'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import {
  getCompanySecretPlaceholder,
  getPlatformCredentialFields,
  type CompanyFormValues,
} from '../lib/company-form'
import type { CompanyPlatform } from '../types'

type CompanyCredentialsFieldsProps = {
  platform: CompanyPlatform
}

function SecretStatus(props: { configured: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge variant={props.configured ? 'secondary' : 'outline'}>
      {props.configured ? t('Configured') : t('Not configured')}
    </Badge>
  )
}

export function CompanyCredentialsFields(props: CompanyCredentialsFieldsProps) {
  const { t } = useTranslation()
  const form = useFormContext<CompanyFormValues>()
  const credentialFields = getPlatformCredentialFields(props.platform)

  if (credentialFields.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {t('No platform credentials are required.')}
        </AlertDescription>
      </Alert>
    )
  }

  if (credentialFields.includes('feishu_app_id')) {
    const configured = form.getValues('feishu_secret_configured')
    return (
      <FieldGroup>
        <FormField
          control={form.control}
          name='feishu_app_id'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Feishu App ID')}</FormLabel>
              <FormControl>
                <Input autoComplete='off' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='feishu_app_secret'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between gap-2'>
                <FormLabel>{t('Feishu App Secret')}</FormLabel>
                <SecretStatus configured={configured} />
              </div>
              <FormControl>
                <Input
                  type='password'
                  autoComplete='new-password'
                  placeholder={getCompanySecretPlaceholder(
                    configured,
                    t('Enter a new secret')
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t(
                  'Secrets are never displayed. Leave blank to keep the existing secret.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FieldGroup>
    )
  }

  const configured = form.getValues('dingtalk_secret_configured')
  return (
    <FieldGroup>
      <FormField
        control={form.control}
        name='dingtalk_client_id'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('DingTalk Client ID')}</FormLabel>
            <FormControl>
              <Input autoComplete='off' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='dingtalk_client_secret'
        render={({ field }) => (
          <FormItem>
            <div className='flex items-center justify-between gap-2'>
              <FormLabel>{t('DingTalk Client Secret')}</FormLabel>
              <SecretStatus configured={configured} />
            </div>
            <FormControl>
              <Input
                type='password'
                autoComplete='new-password'
                placeholder={getCompanySecretPlaceholder(
                  configured,
                  t('Enter a new secret')
                )}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t(
                'Secrets are never displayed. Leave blank to keep the existing secret.'
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FieldGroup>
  )
}
