import {
  AlertTriangle,
  Coins,
  DollarSign,
  Hash,
  Layers,
  Timer,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DepartmentStat } from '../types'

export function DepartmentStatsCards(props: { stat: DepartmentStat }) {
  const { t } = useTranslation()
  const stat = props.stat

  const formatTokens = (tokens: number | undefined): string => {
    if (!tokens) return '0'
    return (tokens / 1_0000_0000).toFixed(2) + ' 亿'
  }

  const formatTokensDetail = (tokens: number | undefined): string => {
    if (!tokens) return '0'
    return tokens.toLocaleString()
  }

  const formatCNY = (amount: number | undefined): string => {
    if (!amount) return '¥0'
    return '¥' + amount.toFixed(2)
  }

  const formatRequests = (count: number | undefined): string => {
    if (!count) return '0'
    if (count >= 1_0000) {
      return (count / 1_0000).toFixed(2) + ' 万'
    }
    return count.toLocaleString()
  }

  const items: {
    title: string
    value: string
    desc: string
    icon: LucideIcon
    valueClassName?: string
    tooltip?: string
  }[] = [
    {
      title: t('Total Tokens'),
      value: formatTokens(stat.total_tokens),
      desc: t('Statistical tokens'),
      icon: Layers,
      tooltip: formatTokensDetail(stat.total_tokens),
    },
    {
      title: t('Total Cost'),
      value: formatCNY(stat.total_amount_cny),
      desc: t('Statistical quota'),
      icon: Coins,
    },
    {
      title: t('Avg Price'),
      value:
        (!stat.avg_price_per_mt
          ? '¥0'
          : '¥' + stat.avg_price_per_mt.toFixed(2)) + '/MT',
      desc: t('Average price per million tokens'),
      icon: DollarSign,
    },
    {
      title: t('Total Requests'),
      value: formatRequests(stat.total_requests),
      desc: t('Statistical count'),
      icon: Hash,
    },
    {
      title: t('Registered Count'),
      value: (stat.registered_users ?? 0).toLocaleString(),
      desc: t('Registered people count'),
      icon: UserCheck,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: t('Unregistered Count'),
      value: (stat.unregistered_users ?? 0).toLocaleString(),
      desc: t('Unregistered people count'),
      icon: UserX,
      valueClassName: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: t('Avg Response Time'),
      value: (stat.avg_use_time ?? 0).toFixed(1) + 's',
      desc: t('Average response time'),
      icon: Timer,
    },
    {
      title: t('Error Rate'),
      value: (stat.error_rate ?? 0).toFixed(1) + '%',
      desc: t('Request error rate'),
      icon: AlertTriangle,
    },
  ]

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='divide-border/60 grid min-w-0 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-4'>
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className={cn(
                'min-w-0 px-3 py-2.5 sm:px-5 sm:py-4',
                index === items.length - 1 &&
                  items.length % 2 !== 0 &&
                  'col-span-2 sm:col-span-1'
              )}
            >
              <div className='flex min-w-0 items-center gap-2'>
                <Icon className='text-muted-foreground/60 size-3.5 shrink-0' />
                <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                  {item.title}
                </div>
              </div>
              {item.tooltip ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div
                        className={cn(
                          'mt-1.5 max-w-full truncate font-mono text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl',
                          item.valueClassName || 'text-foreground'
                        )}
                      />
                    }
                  >
                    {item.value}
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className='font-mono text-xs'>{item.tooltip}</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div
                  className={cn(
                    'mt-1.5 max-w-full truncate font-mono text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl',
                    item.valueClassName || 'text-foreground'
                  )}
                >
                  {item.value}
                </div>
              )}
              <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
                {item.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
