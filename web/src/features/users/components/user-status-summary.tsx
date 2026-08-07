/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'

type UserStatusSummaryProps = {
  enabledCount: number
  disabledCount: number
}

export function UserStatusSummary(props: UserStatusSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className='flex shrink-0 items-baseline gap-1.5 text-xs font-medium whitespace-nowrap sm:text-sm'>
      <span className='text-muted-foreground/80'>{t('Employed:')}</span>
      <span className='text-foreground tabular-nums'>
        {props.enabledCount.toLocaleString()}
      </span>
      <span className='text-muted-foreground/50'>|</span>
      <span className='text-muted-foreground/80'>{t('Disabled:')}</span>
      <span className='text-foreground tabular-nums'>
        {props.disabledCount.toLocaleString()}
      </span>
    </div>
  )
}
