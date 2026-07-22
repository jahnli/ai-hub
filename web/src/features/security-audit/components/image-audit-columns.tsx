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
/* eslint-disable react-refresh/only-export-components */
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, ImageOff, Star } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LongText } from '@/components/long-text'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserInfo } from '@/features/usage-logs/api'
import { ModelBadge } from '@/features/usage-logs/components/model-badge'
import { UserProfileHoverCard } from '@/features/users/components/user-profile-hover-card'
import type { UserColumnRow } from '@/features/users/types'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatQuotaWithCurrency } from '@/lib/currency'
import dayjs from '@/lib/dayjs'

import type { ImageAuditItem } from '../types'

/** Reuses the image-studio mode wording so audit and studio stay consistent. */
export function imageAuditModeLabelKey(mode: string): string {
  return mode === 'edit' ? 'Image to image' : 'Text to image'
}

function ImageAuditUserCell(props: { item: ImageAuditItem }) {
  const [userData, setUserData] = useState<UserColumnRow | null>(null)
  const fetchedUserId = useRef<number | null>(null)

  const handleFetchUser = useCallback(() => {
    if (fetchedUserId.current === props.item.user_id) return

    fetchedUserId.current = props.item.user_id
    void getUserInfo(props.item.user_id).then((response) => {
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
  }, [props.item.user_id])

  const primaryName =
    props.item.display_name || props.item.username || `#${props.item.user_id}`
  const avatarFallback = getUserAvatarFallback(primaryName)
  const avatarFallbackStyle = getUserAvatarStyle(primaryName)
  const hasDistinctUsername =
    props.item.display_name && props.item.display_name !== props.item.username
  const fallbackUser: UserColumnRow = {
    id: props.item.user_id,
    username: props.item.username,
    display_name: primaryName,
    avatar_url: props.item.avatar_url || undefined,
    quota: 0,
    used_quota: 0,
    sub_quota_used: 0,
    sub_quota_total: 0,
    request_count: 0,
    group: '',
    status: 1,
    role: 1,
  }

  return (
    <div
      className='flex min-w-0 items-center gap-2 pl-2'
      onMouseEnter={handleFetchUser}
    >
      <UserProfileHoverCard user={userData ?? fallbackUser}>
        <Avatar size='sm' className='shrink-0'>
          {props.item.avatar_url ? (
            <AvatarImage src={props.item.avatar_url} alt={primaryName} />
          ) : null}
          <AvatarFallback
            className='text-xs font-medium text-white'
            style={avatarFallbackStyle}
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </UserProfileHoverCard>
      <div className='flex w-[130px] min-w-0 flex-col gap-1'>
        <LongText className='max-w-full font-medium'>{primaryName}</LongText>
        {hasDistinctUsername ? (
          <LongText className='text-muted-foreground max-w-full text-xs'>
            {props.item.username}
          </LongText>
        ) : null}
      </div>
    </div>
  )
}

function ImageAuditThumbnails(props: {
  item: ImageAuditItem
  onPreview: (item: ImageAuditItem, index: number) => void
}) {
  const { t } = useTranslation()
  const images = props.item.images ?? []
  if (images.length === 0) {
    return (
      <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
        <ImageOff className='size-3.5' aria-hidden='true' />
        {t('No images')}
      </span>
    )
  }

  const visible = images.slice(0, 3)
  const rest = images.length - visible.length
  return (
    <div className='flex items-center gap-1.5'>
      {visible.map((image, index) => (
        <button
          key={image.id}
          type='button'
          className='bg-muted/30 hover:ring-primary/50 size-12 shrink-0 overflow-hidden rounded-md border transition hover:ring-2'
          onClick={() => props.onPreview(props.item, index)}
          aria-label={t('Image preview')}
        >
          <img
            src={image.url}
            alt=''
            loading='lazy'
            className='size-full object-cover'
          />
        </button>
      ))}
      {rest > 0 && (
        <button
          type='button'
          className='bg-muted text-muted-foreground hover:ring-primary/50 flex size-12 shrink-0 items-center justify-center rounded-md border text-xs font-medium transition hover:ring-2'
          onClick={() => props.onPreview(props.item, visible.length)}
          aria-label={t('Image preview')}
        >
          +{rest}
        </button>
      )}
    </div>
  )
}

export function useImageAuditColumns(
  onPreview: (item: ImageAuditItem, index: number) => void,
  onViewDetail: (item: ImageAuditItem) => void,
  onViewRequestContent: (item: ImageAuditItem) => void
): ColumnDef<ImageAuditItem>[] {
  const { t } = useTranslation()

  return useMemo<ColumnDef<ImageAuditItem>[]>(
    () => [
      {
        id: 'identity',
        header: t('User'),
        meta: { mobileTitle: true },
        size: 180,
        cell: ({ row }) => <ImageAuditUserCell item={row.original} />,
      },
      {
        id: 'created_at',
        header: t('Time'),
        size: 150,
        cell: ({ row }) => (
          <div className='flex flex-col gap-0.5 text-sm tabular-nums'>
            <span>
              {dayjs(row.original.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </span>
            {row.original.duration_ms > 0 && (
              <span className='text-muted-foreground text-xs'>
                {t('Took {{seconds}}s', {
                  seconds: (row.original.duration_ms / 1000).toFixed(1),
                })}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'images',
        header: t('Images'),
        size: 180,
        cell: ({ row }) => (
          <ImageAuditThumbnails item={row.original} onPreview={onPreview} />
        ),
      },
      {
        id: 'prompt',
        header: t('Request content'),
        size: 260,
        cell: ({ row }) => {
          const requestContent = row.original.prompt || '-'
          return (
            <div className='flex items-start gap-1.5'>
              {row.original.favorite && (
                <Star
                  className='mt-0.5 size-3 shrink-0 fill-amber-400 text-amber-400'
                  aria-label={t('Favorite')}
                />
              )}
              <button
                type='button'
                className='text-muted-foreground line-clamp-2 max-w-[240px] cursor-pointer text-left text-xs leading-snug break-all whitespace-normal hover:underline disabled:cursor-default disabled:no-underline'
                onClick={() => onViewRequestContent(row.original)}
                disabled={!row.original.prompt}
                title={row.original.prompt ? t('Request Content') : undefined}
              >
                {requestContent}
              </button>
            </div>
          )
        },
      },
      {
        id: 'model',
        header: t('Model'),
        size: 170,
        cell: ({ row }) => (
          <ModelBadge modelName={row.original.model} className='font-normal' />
        ),
      },
      {
        id: 'mode',
        header: t('Mode'),
        size: 100,
        cell: ({ row }) => (
          <Badge variant='secondary' className='font-normal'>
            {t(imageAuditModeLabelKey(row.original.mode))}
          </Badge>
        ),
      },
      {
        id: 'params',
        header: t('Parameters'),
        size: 160,
        cell: ({ row }) => {
          const parts = [
            row.original.size,
            row.original.quality,
            row.original.output_format,
          ].filter(Boolean)
          if (parts.length === 0) {
            return <span className='text-muted-foreground text-xs'>-</span>
          }
          return (
            <span className='text-muted-foreground text-xs'>
              {parts.join(' · ')}
            </span>
          )
        },
      },
      {
        id: 'quota',
        header: t('Cost'),
        size: 110,
        cell: ({ row }) => (
          <span className='border-border/80 bg-muted/60 inline-flex h-6 w-fit items-center rounded-md border px-2 text-sm leading-none font-normal tabular-nums'>
            {formatQuotaWithCurrency(row.original.quota ?? 0, {
              digitsLarge: 2,
              digitsSmall: 2,
              abbreviate: false,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 100,
        cell: ({ row }) => (
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1.5 px-2 text-xs'
            onClick={() => onViewDetail(row.original)}
          >
            <Eye className='size-3.5' />
            {t('Details')}
          </Button>
        ),
      },
    ],
    [t, onPreview, onViewDetail, onViewRequestContent]
  )
}
