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
import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import dayjs from '@/lib/dayjs'

import type { ImageAuditItem } from '../types'
import { imageAuditModeLabelKey } from './image-audit-columns'

interface ImageAuditRequestContentDialogProps {
  item: ImageAuditItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getRequestParameters(item: ImageAuditItem) {
  return {
    mode: item.mode,
    size: item.size || undefined,
    quality: item.quality || undefined,
    moderation: item.moderation || undefined,
    output_format: item.output_format || undefined,
    n: item.n,
  }
}

export function ImageAuditRequestContentDialog(
  props: ImageAuditRequestContentDialogProps
) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })

  if (!props.item) return null

  const item = props.item
  const primaryName = item.display_name || item.username || `#${item.user_id}`
  const shouldShowUsername =
    Boolean(item.username) && item.username !== primaryName
  const avatarFallback = getUserAvatarFallback(primaryName)
  const avatarFallbackStyle = getUserAvatarStyle(primaryName)
  const requestParameters = JSON.stringify(getRequestParameters(item), null, 2)

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('Request Content')}
      contentClassName='h-[75vh] sm:max-w-[78rem]'
      contentHeight='100%'
      bodyContainerClassName='flex-1 max-h-none overflow-hidden'
      bodyClassName='h-full min-h-0'
    >
      <div className='flex h-full min-h-0 flex-col space-y-3'>
        <div className='flex shrink-0 items-start gap-3 border-b pb-3'>
          <Avatar className='size-9 shrink-0'>
            {item.avatar_url && (
              <AvatarImage src={item.avatar_url} alt={primaryName} />
            )}
            <AvatarFallback
              className='text-sm font-semibold text-white'
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-1'>
            <div className='flex min-w-24 shrink-0 flex-col'>
              <span className='truncate text-sm font-medium'>{primaryName}</span>
              {shouldShowUsername && (
                <span className='text-muted-foreground truncate text-xs'>
                  {item.username}
                </span>
              )}
            </div>
            <div className='text-muted-foreground flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm'>
              <ModelBadge modelName={item.model} className='font-normal' />
              <span className='text-muted-foreground/60'>·</span>
              <Badge variant='secondary' className='font-normal'>
                {t(imageAuditModeLabelKey(item.mode))}
              </Badge>
              <span className='text-muted-foreground/60'>·</span>
              <span className='tabular-nums'>
                {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>

        <div className='grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)] md:grid-rows-[minmax(0,1fr)]'>
          <div className='h-full min-h-0 overflow-y-auto overscroll-contain pr-3'>
            <div className='rounded-lg border'>
              <div className='flex items-center justify-between gap-2 px-3 py-2'>
                <span className='text-sm font-medium'>{t('Request content')}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 w-7 shrink-0 p-0'
                  onClick={() => copyToClipboard(item.prompt)}
                  title={t('Copy to clipboard')}
                >
                  {copiedText === item.prompt ? (
                    <Check className='size-3.5 text-green-600' />
                  ) : (
                    <Copy className='size-3.5' />
                  )}
                </Button>
              </div>
              <p className='bg-muted/40 border-t p-3 text-sm leading-relaxed break-words whitespace-pre-wrap'>
                {item.prompt || '-'}
              </p>
            </div>
          </div>

          <div className='h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain'>
            <div className='rounded-lg border px-3 py-2'>
              <span className='text-sm font-medium'>
                {t('Request Parameters')}
              </span>
              <pre className='bg-muted mt-2 overflow-x-auto rounded-md p-3 text-xs whitespace-pre'>
                {requestParameters}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
