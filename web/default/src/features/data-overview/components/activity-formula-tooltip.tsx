import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

interface ActivityFormulaTooltipProps {
  formula?: [number, number, number]
}

const DEFAULT_ACTIVITY_FORMULA: [number, number, number] = [
  10, 1_000_000, 0.85,
]

export function ActivityFormulaTooltip(props: ActivityFormulaTooltipProps) {
  const { t } = useTranslation()
  const currentUserRole = useAuthStore((state) => state.auth.user?.role)
  const canViewFormula = (currentUserRole ?? ROLE.GUEST) >= ROLE.ADMIN
  const formula = props.formula ?? DEFAULT_ACTIVITY_FORMULA
  const requestBase = formula[0]
  const tokenBase = formula[1]
  const exponent = formula[2]

  if (!canViewFormula) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            className='text-muted-foreground/70 hover:text-foreground shrink-0'
            aria-label={t('Usage threshold formula')}
          />
        }
      >
        <CircleAlert className='size-3.5' />
      </TooltipTrigger>
      <TooltipContent className='max-w-96'>
        <div className='space-y-2 text-xs leading-relaxed'>
          <p>
            {t('Usage thresholds are calculated from environment settings.')}
          </p>
          <p className='font-mono'>
            [{requestBase}, {tokenBase}, {exponent}]
          </p>
          <ul className='list-disc space-y-1 pl-4'>
            <li>
              {t('Request base: {{value}} requests for one day.', {
                value: requestBase.toLocaleString(),
              })}
            </li>
            <li>
              {t('Token base: {{value}} tokens for one day.', {
                value: tokenBase.toLocaleString(),
              })}
            </li>
            <li>
              {t(
                'Growth exponent: {{value}}, controlling how thresholds scale with the number of days.',
                { value: exponent }
              )}
            </li>
          </ul>
          <p>{t('d is the number of days in the selected period.')}</p>
          <div className='font-mono'>
            <div>
              R = ⌈{requestBase} × d^{exponent}⌉
            </div>
            <div>
              T = ⌈{tokenBase.toLocaleString()} × d^{exponent}⌉
            </div>
          </div>
          <p>
            {t(
              'A user is counted when requests or tokens reach the threshold.'
            )}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
