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
import { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { Turnstile } from '@/components/turnstile'
import { ldapLogin } from '@/features/auth/api'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'

type LDAPLoginDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loginLabel?: string
  redirectTo?: string
  requiresLegalConsent?: boolean
  agreedToLegal?: boolean
}

export function LDAPLoginDialog({
  open,
  onOpenChange,
  loginLabel,
  redirectTo,
  requiresLegalConsent,
  agreedToLegal,
}: LDAPLoginDialogProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { handleLoginSuccess } = useAuthRedirect()
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()

  const handleReset = () => {
    setUsername('')
    setPassword('')
    setIsSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) handleReset()
  }

  async function handleSubmit() {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(t('Please agree to the legal terms first'))
      return
    }
    if (!username.trim() || !password) {
      toast.error(t('Username or password is empty'))
      return
    }
    if (!validateTurnstile()) return

    setIsSubmitting(true)
    try {
      const res = await ldapLogin({
        username: username.trim(),
        password,
        turnstile: turnstileToken,
      })
      if (res.success) {
        await handleLoginSuccess(res.data as { id?: number } | null, redirectTo)
        toast.success(t('Welcome back!'))
        handleOpenChange(false)
      }
    } catch (_error) {
      // Errors are handled by global interceptor
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={loginLabel || t('LDAP sign in')}
      description={t('Sign in with your LDAP account')}
      contentClassName='max-w-sm'
      headerClassName='text-left'
      contentHeight='auto'
      bodyClassName='space-y-4'
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('Cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='gap-2'
          >
            {isSubmitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <LogIn className='h-4 w-4' />
            )}
            {t('Sign in')}
          </Button>
        </>
      }
    >
      <div className='grid gap-2'>
        <Label htmlFor='ldap-username'>{t('Username')}</Label>
        <Input
          id='ldap-username'
          placeholder={t('Enter your username')}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete='username'
        />
      </div>
      <div className='grid gap-2'>
        <Label htmlFor='ldap-password'>{t('Password')}</Label>
        <PasswordInput
          id='ldap-password'
          placeholder={t('Enter password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='current-password'
        />
      </div>
      {isTurnstileEnabled && (
        <Turnstile siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
      )}
    </Dialog>
  )
}
