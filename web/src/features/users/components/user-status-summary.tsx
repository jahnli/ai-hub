import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

type UserStatusSummaryProps = {
  totalCount: number
  enabledCount: number
  disabledCount: number
}

export function UserStatusSummary(props: UserStatusSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className='flex shrink-0 flex-wrap items-center gap-2 text-xs font-medium whitespace-nowrap sm:text-sm'>
      <Badge className='h-6 px-2.5 py-1' variant='outline'>
        <span className='text-muted-foreground'>{t('Total:')}</span>
        <span className='text-foreground tabular-nums'>
          {props.totalCount.toLocaleString()}
        </span>
      </Badge>
      <Badge className='h-6 border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400'>
        <span className='text-muted-foreground'>{t('Enabled:')}</span>
        <span className='text-foreground tabular-nums'>
          {props.enabledCount.toLocaleString()}
        </span>
      </Badge>
      <Badge className='h-6 px-2.5 py-1' variant='warning'>
        <span className='text-muted-foreground'>{t('Disabled:')}</span>
        <span className='text-foreground tabular-nums'>
          {props.disabledCount.toLocaleString()}
        </span>
      </Badge>
    </div>
  )
}
