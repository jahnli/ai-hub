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
import { Check, Copy, ImageOff } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserInfo } from '@/features/usage-logs/api'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { UserProfileHoverCard } from '@/features/users/components/user-profile-hover-card'
import type { UserColumnRow } from '@/features/users/types'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import dayjs from '@/lib/dayjs'

import type { ImageAuditItem } from '../types'
import { imageAuditModeLabelKey } from './image-audit-columns'

interface ImageAuditRequestContentDialogProps {
  item: ImageAuditItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPreview: (item: ImageAuditItem, index: number) => void
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
  const [userData, setUserData] = useState<UserColumnRow | null>(null)
  const fetchedUserId = useRef<number | null>(null)

  const handleFetchUser = useCallback(() => {
    const userId = props.item?.user_id
    if (!userId || fetchedUserId.current === userId) return

    fetchedUserId.current = userId
    void getUserInfo(userId).then((response) => {
      if (!response.success || !response.data) return

      const userInfo = response.data
      setUserData({
        id: userInfo.id,
        username: userInfo.username,
        display_name: userInfo.display_name || userInfo.username,
        email: userInfo.email,
        avatar_url: userInfo.avatar_url,
        remark: userInfo.remark,
        quota: userInfo.quota,
        used_quota: userInfo.used_quota,
        sub_quota_used: 0,
        sub_quota_total: 0,
        request_count: userInfo.request_count,
        group: userInfo.group || '',
        status: userInfo.status ?? 1,
        role: userInfo.role ?? 1,
        department_name: userInfo.department_name,
        custom_field_values: userInfo.custom_field_values,
        join_date: userInfo.join_date,
        job_number: userInfo.job_number,
        job_title: userInfo.job_title,
        description: userInfo.description,
        background_image: userInfo.background_image,
        mobile: userInfo.mobile,
        open_id: userInfo.open_id,
        gender: userInfo.gender,
      })
    })
  }, [props.item?.user_id])

  if (!props.item) return null

  const item = props.item
  const fallbackUser: UserColumnRow = {
    id: item.user_id,
    username: item.username,
    display_name: item.display_name || item.username || `#${item.user_id}`,
    avatar_url: item.avatar_url || undefined,
    quota: 0,
    used_quota: 0,
    sub_quota_used: 0,
    sub_quota_total: 0,
    request_count: 0,
    group: '',
    status: 1,
    role: 1,
  }
  const resolvedUser =
    userData?.id === item.user_id ? userData : fallbackUser
  const primaryName =
    resolvedUser.display_name || resolvedUser.username || `#${item.user_id}`
  const shouldShowUsername =
    Boolean(resolvedUser.username) && resolvedUser.username !== primaryName
  const avatarFallback = getUserAvatarFallback(primaryName)
  const avatarFallbackStyle = getUserAvatarStyle(primaryName)
  const images = item.images ?? []
  const requestParameters = JSON.stringify(getRequestParameters(item), null, 2)

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('Request Content')}
      contentClassName='h-[85vh] sm:max-w-[78rem]'
      contentHeight='100%'
      bodyContainerClassName='flex-1 max-h-none overflow-hidden'
      bodyClassName='h-full min-h-0'
    >
      <div className='flex h-full min-h-0 flex-col space-y-3'>
        <div className='flex shrink-0 items-start gap-3 border-b pb-3'>
          <UserProfileHoverCard user={resolvedUser}>
            <Avatar className='size-9 shrink-0' onMouseEnter={handleFetchUser}>
              {resolvedUser.avatar_url && (
                <AvatarImage
                  src={resolvedUser.avatar_url}
                  alt={primaryName}
                />
              )}
              <AvatarFallback
                className='text-sm font-semibold text-white'
                style={avatarFallbackStyle}
              >
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </UserProfileHoverCard>
          <div className='flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-1'>
            <div className='flex min-w-24 shrink-0 flex-col'>
              <span className='truncate text-sm font-medium'>{primaryName}</span>
              {shouldShowUsername && (
                <span className='text-muted-foreground truncate text-xs'>
                  {resolvedUser.username}
                </span>
              )}
            </div>
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-sm'>
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
              {item.user_agent && (
                <div className='text-muted-foreground flex min-w-0 items-start gap-1 text-sm'>
                  <span className='shrink-0'>{t('User-Agent')}:</span>
                  <span className='min-w-0 break-all'>{item.user_agent}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden'>
          <div className='grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 lg:pr-2'>
            <section className='flex min-h-0 flex-col overflow-hidden rounded-lg border'>
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
              <p className='bg-muted/40 min-h-0 flex-1 overflow-y-auto border-t p-3 text-sm leading-relaxed break-words whitespace-pre-wrap'>
                {item.prompt || '-'}
              </p>
            </section>

            <section className='mt-auto shrink-0 overflow-hidden rounded-lg border'>
              <div className='flex items-center gap-2 border-b px-3 py-2'>
                <span className='text-sm font-medium'>{t('Images')}</span>
                <Badge variant='secondary' className='tabular-nums'>
                  {images.length} / {item.n}
                </Badge>
              </div>
              {images.length > 0 ? (
                <div className='min-h-0 p-3'>
                  <div className='grid w-full grid-cols-4 gap-3'>
                    {images.slice(0, 4).map((image, index) => (
                      <button
                        key={image.id}
                        type='button'
                        className='group bg-muted/30 focus-visible:ring-ring relative aspect-square w-full min-w-0 overflow-hidden rounded-lg border text-left focus-visible:ring-2 focus-visible:outline-none'
                        onClick={() => props.onPreview(item, index)}
                        aria-label={`${t('Image preview')} ${index + 1}`}
                      >
                        <img
                          src={image.url}
                          alt={image.revised_prompt?.slice(0, 80) || ''}
                          loading='lazy'
                          className='size-full object-contain transition-transform duration-200 group-hover:scale-[1.03]'
                        />
                        <span className='bg-background/85 text-foreground absolute right-2 bottom-2 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums shadow-sm backdrop-blur-sm'>
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-end gap-2 p-6 text-sm'>
                  <ImageOff className='size-6' aria-hidden='true' />
                  <span>{t('No images')}</span>
                </div>
              )}
            </section>
          </div>

          <aside className='min-h-0 overflow-y-auto rounded-lg border lg:h-full'>
            <div className='border-b px-3 py-2'>
              <span className='text-sm font-medium'>
                {t('Request Parameters')}
              </span>
            </div>
            <div className='p-3'>
              <pre className='bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre'>
                {requestParameters}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </Dialog>
  )
}
