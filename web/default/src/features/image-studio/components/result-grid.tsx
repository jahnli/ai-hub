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
import {
  Copy,
  Download,
  ImageIcon,
  PackageOpen,
  Pencil,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'

import {
  copyImageToClipboard,
  downloadImage,
  downloadImagesAsZip,
  imageFileName,
} from '../lib/image-utils'
import type { GeneratedImage, GenerationRecord } from '../types'

type ResultGridProps = {
  record: GenerationRecord | null
  error: string | null
  onRetry: () => void
  onEditImage: (image: GeneratedImage) => void
  isGenerating: boolean
}

function UsageBar({ record }: { record: GenerationRecord }) {
  const { t } = useTranslation()
  const usage = record.usage
  return (
    <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
      <Badge variant='secondary'>{record.model}</Badge>
      <span>{t(record.size)}</span>
      {record.quality && <span>{t(record.quality)}</span>}
      <span>
        {t('{{count}} images', { count: record.images.length })}
      </span>
      {usage && (
        <span className='tabular-nums'>
          {t('Took {{seconds}}s', {
            seconds: (usage.durationMs / 1000).toFixed(1),
          })}
        </span>
      )}
    </div>
  )
}

export function ResultGrid({
  record,
  error,
  onRetry,
  onEditImage,
  isGenerating,
}: ResultGridProps) {
  const { t } = useTranslation()
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)

  if (error) {
    return (
      <div className='border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4'>
        <p className='text-destructive text-sm break-all'>{error}</p>
        <div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={onRetry}
            disabled={isGenerating}
          >
            <RefreshCw className='size-3.5' />
            {t('Retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <Empty className='border-none py-16'>
        {!isGenerating && (
          <ImageIcon className='text-muted-foreground/50 size-10' />
        )}
        <div className='text-muted-foreground flex flex-col items-center gap-2 text-sm'>
          {isGenerating ? (
            <>
              <span className='animate-pulse'>{t('Thinking')}</span>
              <span className='flex h-5 items-end gap-1' aria-hidden='true'>
                <span className='bg-primary/40 h-2 w-1 animate-pulse rounded-full' />
                <span className='bg-primary/60 h-4 w-1 animate-pulse rounded-full [animation-delay:120ms]' />
                <span className='bg-primary/80 h-5 w-1 animate-pulse rounded-full [animation-delay:240ms]' />
                <span className='bg-primary/60 h-3 w-1 animate-pulse rounded-full [animation-delay:360ms]' />
                <span className='bg-primary/40 h-2 w-1 animate-pulse rounded-full [animation-delay:480ms]' />
              </span>
            </>
          ) : (
            t('Generated images will appear here')
          )}
        </div>
      </Empty>
    )
  }

  const handleDownloadAll = async () => {
    const skipped = await downloadImagesAsZip(
      record.images,
      `images-${record.createdAt}`,
      record.outputFormat
    )
    if (skipped > 0) {
      toast.warning(t('{{count}} images could not be packed', { count: skipped }))
    }
  }

  const handleCopy = async (image: GeneratedImage) => {
    try {
      await copyImageToClipboard(image.src)
      toast.success(t('Image copied to clipboard'))
    } catch {
      toast.error(t('Copy failed, please download instead'))
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <UsageBar record={record} />
        {record.images.length > 1 && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={() => void handleDownloadAll()}
          >
            <PackageOpen className='size-3.5' />
            {t('Download all')}
          </Button>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
        {record.images.map((image, index) => (
          <div
            key={image.id}
            className='group bg-muted/30 relative overflow-hidden rounded-lg border'
          >
            <button
              type='button'
              className='block w-full'
              onClick={() => setPreviewImage(image)}
            >
              <img
                src={image.src}
                alt={record.prompt.slice(0, 80)}
                loading='lazy'
                className='aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]'
              />
            </button>
            <div className='bg-background/85 absolute inset-x-0 bottom-0 hidden items-center justify-end gap-1 p-1.5 backdrop-blur-sm group-hover:flex'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7'
                onClick={() =>
                  void downloadImage(
                    image.src,
                    imageFileName(index, image.src, record.outputFormat)
                  )
                }
                aria-label={t('Download')}
              >
                <Download className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7'
                onClick={() => void handleCopy(image)}
                aria-label={t('Copy image')}
              >
                <Copy className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7'
                onClick={() => onEditImage(image)}
                aria-label={t('Edit this image')}
              >
                <Pencil className='size-3.5' />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className='max-w-[min(92vw,900px)]'>
          <DialogTitle className='sr-only'>{t('Image preview')}</DialogTitle>
          {previewImage && (
            <div className='flex flex-col gap-3'>
              <img
                src={previewImage.src}
                alt={record.prompt.slice(0, 80)}
                className='max-h-[70vh] w-full rounded-lg object-contain'
              />
              {previewImage.revisedPrompt && (
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  <span className='font-medium'>{t('Revised prompt')}: </span>
                  {previewImage.revisedPrompt}
                </p>
              )}
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() =>
                    void downloadImage(
                      previewImage.src,
                      imageFileName(
                        record.images.findIndex(
                          (item) => item.id === previewImage.id
                        ),
                        previewImage.src,
                        record.outputFormat
                      )
                    )
                  }
                >
                  <Download className='size-3.5' />
                  {t('Download')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() => {
                    onEditImage(previewImage)
                    setPreviewImage(null)
                  }}
                >
                  <Pencil className='size-3.5' />
                  {t('Edit this image')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
