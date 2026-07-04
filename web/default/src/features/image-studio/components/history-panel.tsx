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
import { History, Search, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import type { GenerationRecord } from '../types'

type HistoryPanelProps = {
  history: GenerationRecord[]
  activeRecordId: string | null
  onRestore: (record: GenerationRecord) => void
  onDelete: (id: string) => void
  onClear: () => void
  onToggleFavorite: (id: string) => void
  disabled?: boolean
}

export function HistoryPanel({
  history,
  activeRecordId,
  onRestore,
  onDelete,
  onClear,
  onToggleFavorite,
  disabled = false,
}: HistoryPanelProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase()
    return history.filter((record) => {
      if (favoritesOnly && !record.favorite) return false
      if (!lower) return true
      return (
        record.prompt.toLowerCase().includes(lower) ||
        record.model.toLowerCase().includes(lower)
      )
    })
  }, [history, keyword, favoritesOnly])

  return (
    <div className='flex h-full min-h-0 flex-col gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 text-sm font-medium'>
          <History className='size-4' />
          {t('History')}
          <span className='text-muted-foreground text-xs'>
            ({history.length})
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn('size-7', favoritesOnly && 'text-amber-500')}
            onClick={() => setFavoritesOnly((prev) => !prev)}
            disabled={disabled}
            aria-label={t('Show favorites only')}
          >
            <Star
              className={cn('size-3.5', favoritesOnly && 'fill-current')}
            />
          </Button>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='text-muted-foreground hover:text-destructive size-7'
                    disabled={disabled}
                    aria-label={t('Clear history')}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('Clear history')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      'This will permanently delete generation history and stored image files.'
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onClear}>
                    {t('Clear all')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className='relative'>
        <Search className='text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('Search prompt or model')}
          className='h-8 pl-8 text-xs'
          disabled={disabled}
        />
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='flex flex-col gap-1.5 pr-2'>
          {filtered.length === 0 && (
            <p className='text-muted-foreground py-8 text-center text-xs'>
              {t('No history yet')}
            </p>
          )}
          {disabled && history.length > 0 && (
            <p className='text-muted-foreground px-1 text-[11px] leading-snug'>
              {t('History is temporarily disabled during generation')}
            </p>
          )}
          {filtered.map((record) => (
            <div
              key={record.id}
              className={cn(
                'group relative rounded-lg border p-2 transition-colors',
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-muted/60 cursor-pointer',
                activeRecordId === record.id &&
                  'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
              )}
              onClick={() => {
                if (!disabled) onRestore(record)
              }}
              role='button'
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (!disabled && e.key === 'Enter') onRestore(record)
              }}
            >
              <div className='flex items-start gap-2'>
                {record.images[0] && (
                  <img
                    src={record.images[0].src}
                    alt=''
                    loading='lazy'
                    className='size-12 shrink-0 rounded-md object-cover'
                  />
                )}
                <div className='min-w-0 flex-1'>
                  <p className='line-clamp-2 text-xs leading-snug'>
                    {record.prompt}
                  </p>
                  <p className='text-muted-foreground mt-1 truncate text-[10px]'>
                    {record.model} · {record.size}
                    {record.quality && <> · {t(record.quality)}</>}
                    {record.images[0]?.width && record.images[0]?.height && (
                      <>
                        {' '}
                        · {record.images[0].width}×{record.images[0].height}
                      </>
                    )}{' '}
                    · {record.images.length} ·{' '}
                    {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className='absolute top-1 right-1 hidden items-center gap-0.5 group-hover:flex'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className={cn(
                    'bg-background/80 size-6',
                    record.favorite && 'text-amber-500'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) onToggleFavorite(record.id)
                  }}
                  disabled={disabled}
                  aria-label={t('Favorite')}
                >
                  <Star
                    className={cn('size-3', record.favorite && 'fill-current')}
                  />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='bg-background/80 hover:text-destructive size-6'
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) onDelete(record.id)
                  }}
                  disabled={disabled}
                  aria-label={t('Delete')}
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
              {record.favorite && (
                <Star className='absolute top-1.5 right-1.5 size-3 fill-amber-400 text-amber-400 group-hover:hidden' />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
