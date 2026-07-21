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
import { Copy, Download, PackageOpen, Star } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { getUserInfo } from '@/features/usage-logs/api'
import { UserProfileHoverCard } from '@/features/users/components/user-profile-hover-card'
import type { UserColumnRow } from '@/features/users/types'
import {
  downloadImage,
  downloadImagesAsZip,
  imageFileName,
} from '@/features/image-studio/lib/image-utils'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatQuotaWithCurrency } from '@/lib/currency'
import dayjs from '@/lib/dayjs'

import type { ImageAuditItem } from '../types'
import { imageAuditModeLabelKey } from './image-audit-columns'

interface ImageAuditDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImageAuditItem | null
  onPreview: (item: ImageAuditItem, index: number) => void
}

function DetailField(props: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <span className='text-muted-foreground text-xs'>{props.label}</span>
      <span className='min-w-0 text-sm break-all'>{props.children}</span>
    </div>
  )
}

/** Full generation record: user, every stored field, prompt and image grid. */
export function ImageAuditDetailDialog(props: ImageAuditDetailDialogProps) {
  const { t } = useTranslation()
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

  const primaryName = item.display_name || item.username || `#${item.user_id}`
  const avatarFallback = getUserAvatarFallback(primaryName)
  const avatarFallbackStyle = getUserAvatarStyle(primaryName)
  const images = item.images ?? []
  const fallbackUser: UserColumnRow = {
    id: item.user_id,
    username: item.username,
    display_name: primaryName,
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

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt)
      toast.success(t('Copied to clipboard'))
    } catch {
      toast.error(t('Copy failed'))
    }
  }

  const handleDownloadAll = async () => {
    const skipped = await downloadImagesAsZip(
      images.map((image) => ({ id: image.id, src: image.url })),
      `images-${item.id}`,
      item.output_format
    )
    if (skipped > 0) {
      toast.warning(t('{{count}} images could not be packed', { count: skipped }))
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[85vh] w-[60vw] max-w-[60vw] flex-col overflow-hidden sm:max-w-[60vw]'>
        <DialogHeader className='shrink-0'>
          <DialogTitle className='flex items-center gap-2'>
            {t('Generation Details')}
            {item.favorite && (
              <Star
                className='size-4 fill-amber-400 text-amber-400'
                aria-label={t('Favorite')}
              />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div
            className='flex items-center gap-2.5 pl-1.5'
            onMouseEnter={handleFetchUser}
          >
            <UserProfileHoverCard user={userData ?? fallbackUser}>
              <Avatar size='sm' className='shrink-0'>
                {item.avatar_url ? (
                  <AvatarImage src={item.avatar_url} alt={primaryName} />
                ) : null}
                <AvatarFallback
                  className='text-xs font-medium text-white'
                  style={avatarFallbackStyle}
                >
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </UserProfileHoverCard>
            <UserProfileHoverCard user={userData ?? fallbackUser}>
              <div className='flex min-w-0 cursor-pointer flex-col'>
                <span className='truncate text-sm font-medium'>
                  {primaryName}
                </span>
                {item.username && item.username !== primaryName && (
                  <span className='text-muted-foreground truncate text-xs'>
                    {item.username}
                  </span>
                )}
              </div>
            </UserProfileHoverCard>
            <span className='text-muted-foreground ml-auto text-xs tabular-nums'>
              {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>

          <div className='grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 sm:grid-cols-3'>
            <DetailField label={t('Model')}>
              <ModelBadge modelName={item.model} className='font-normal' />
            </DetailField>
            <DetailField label={t('Mode')}>
              <Badge variant='secondary' className='font-normal'>
                {t(imageAuditModeLabelKey(item.mode))}
              </Badge>
            </DetailField>
            {item.group && (
              <DetailField label={t('Group')}>{item.group}</DetailField>
            )}
            {item.size && (
              <DetailField label={t('Size')}>{item.size}</DetailField>
            )}
            {item.quality && (
              <DetailField label={t('Quality')}>{item.quality}</DetailField>
            )}
            {item.moderation && (
              <DetailField label={t('Moderation')}>
                {item.moderation}
              </DetailField>
            )}
            {item.output_format && (
              <DetailField label={t('Output Format')}>
                {item.output_format}
              </DetailField>
            )}
            <DetailField label={t('Image count')}>
              <span className='tabular-nums'>
                {images.length} / {item.n}
              </span>
            </DetailField>
            <DetailField label={t('Duration')}>
              <span className='tabular-nums'>
                {(item.duration_ms / 1000).toFixed(1)}s
              </span>
            </DetailField>
            <DetailField label={t('Cost')}>
              <span className='tabular-nums'>
                {formatQuotaWithCurrency(item.quota ?? 0, {
                  digitsLarge: 2,
                  digitsSmall: 2,
                  abbreviate: false,
                })}
              </span>
            </DetailField>
            <DetailField label={t('Tokens')}>
              <span className='tabular-nums'>
                {(item.prompt_tokens ?? 0).toLocaleString()} /{' '}
                {(item.completion_tokens ?? 0).toLocaleString()}
              </span>
            </DetailField>
          </div>

          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm font-medium'>
                {t('Prompt')}
              </span>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 gap-1 px-1.5 text-xs'
                onClick={() => void handleCopyPrompt()}
              >
                <Copy className='size-3' />
                {t('Copy prompt')}
              </Button>
            </div>
            <p className='bg-muted/40 max-h-40 overflow-y-auto rounded-lg border p-2.5 text-xs leading-relaxed break-all whitespace-pre-wrap'>
              {item.prompt || '-'}
            </p>
          </div>

          {images.length > 0 && (
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm font-medium'>
                  {t('Images')} ({images.length})
                </span>
                {images.length > 1 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-1.5 text-xs'
                    onClick={() => void handleDownloadAll()}
                  >
                    <PackageOpen className='size-3' />
                    {t('Download all')}
                  </Button>
                )}
              </div>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className='group bg-muted/30 relative overflow-hidden rounded-lg border'
                  >
                    <button
                      type='button'
                      className='block w-full'
                      onClick={() => props.onPreview(item, index)}
                      aria-label={t('Image preview')}
                    >
                      <img
                        src={image.url}
                        alt={image.revised_prompt?.slice(0, 80) || ''}
                        loading='lazy'
                        className='aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]'
                      />
                    </button>
                    {image.width && image.height ? (
                      <span className='bg-foreground/50 text-background absolute top-1 left-1 rounded px-1 py-0.5 text-[10px] tabular-nums backdrop-blur-sm'>
                        {image.width}×{image.height}
                      </span>
                    ) : null}
                    <div className='bg-background/25 absolute inset-x-0 bottom-0 hidden items-center justify-end gap-1 p-1.5 backdrop-blur-[1px] group-hover:flex'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        onClick={() =>
                          void downloadImage(
                            image.url,
                            imageFileName(index, image.url, item.output_format)
                          )
                        }
                        aria-label={t('Download')}
                      >
                        <Download className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
