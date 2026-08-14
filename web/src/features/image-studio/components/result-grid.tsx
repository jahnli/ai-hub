import {
  Copy,
  Download,
  ImageIcon,
  ImageOff,
  PackageOpen,
  Pencil,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useState, type WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  onRetryImage: (errorIndex: number) => void
  retryingImageErrorIndexes: number[]
  onEditImage: (image: GeneratedImage) => void
  isGenerating: boolean
  pendingImageCount: number
  imageErrors: string[]
}

function UsageBar({ record }: { record: GenerationRecord }) {
  const { t } = useTranslation()
  const usage = record.usage
  const firstImage = record.images[0]
  const fileSize = formatImageFileSize(firstImage?.sizeBytes)
  return (
    <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
      <Badge variant='secondary'>{record.model}</Badge>
      <span>{t('{{count}} images', { count: record.images.length })}</span>
      {usage && (
        <span className='tabular-nums'>
          {t('Took {{seconds}}s', {
            seconds: (usage.durationMs / 1000).toFixed(1),
          })}
        </span>
      )}
      <span>{t(record.size)}</span>
      {record.quality && <span>{t(record.quality)}</span>}
      {firstImage?.width && firstImage.height && (
        <span className='tabular-nums'>
          {firstImage.width}×{firstImage.height}
        </span>
      )}
      {fileSize && <span className='tabular-nums'>{fileSize}</span>}
    </div>
  )
}

function formatImageFileSize(sizeBytes?: number): string | null {
  if (!sizeBytes || sizeBytes <= 0) return null
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
}

function LoadingImageSlot({ slotIndex }: { slotIndex: number }) {
  const { t } = useTranslation()
  return (
    <div
      className='bg-muted/30 text-muted-foreground flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border'
      role='status'
      aria-label={`${t('Loading')} ${slotIndex + 1}`}
    >
      <span className='animate-pulse'>{t('Generating...')}</span>
      <span className='flex h-5 items-end gap-1' aria-hidden='true'>
        <span className='bg-primary/40 h-2 w-1 animate-pulse rounded-full [animation-duration:450ms]' />
        <span className='bg-primary/60 h-4 w-1 animate-pulse rounded-full [animation-delay:50ms] [animation-duration:450ms]' />
        <span className='bg-primary/80 h-5 w-1 animate-pulse rounded-full [animation-delay:100ms] [animation-duration:450ms]' />
        <span className='bg-primary/60 h-3 w-1 animate-pulse rounded-full [animation-delay:150ms] [animation-duration:450ms]' />
        <span className='bg-primary/40 h-2 w-1 animate-pulse rounded-full [animation-delay:200ms] [animation-duration:450ms]' />
      </span>
    </div>
  )
}

type ImageErrorSlotProps = {
  message: string
  onRetry: () => void
  retryDisabled: boolean
}

function ImageErrorSlot(props: ImageErrorSlotProps) {
  const { t } = useTranslation()
  return (
    <div
      className='border-destructive/30 bg-destructive/5 text-destructive flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center'
      role='alert'
      aria-label={t('Image generation failed')}
    >
      <ImageOff className='size-8 shrink-0 opacity-70' aria-hidden='true' />
      <span className='text-sm font-medium'>
        {t('Image generation failed')}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <p className='line-clamp-4 max-w-full cursor-help text-xs break-all' />
          }
        >
          {props.message}
        </TooltipTrigger>
        <TooltipContent className='max-h-72 max-w-[min(32rem,calc(100vw-2rem))] overflow-y-auto text-left break-all whitespace-normal'>
          {props.message}
        </TooltipContent>
      </Tooltip>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='mt-2 gap-1.5'
        onClick={props.onRetry}
        disabled={props.retryDisabled}
      >
        <RefreshCw className='size-3.5' aria-hidden='true' />
        {t('Retry')}
      </Button>
    </div>
  )
}

export function ResultGrid({
  record,
  error,
  onRetry,
  onRetryImage,
  retryingImageErrorIndexes,
  onEditImage,
  isGenerating,
  pendingImageCount,
  imageErrors,
}: ResultGridProps) {
  const { t } = useTranslation()
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewRotation, setPreviewRotation] = useState(0)

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
    if (isGenerating || imageErrors.length > 0) {
      return (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {imageErrors.map((message) => (
            <ImageErrorSlot
              key={message}
              message={message}
              onRetry={onRetry}
              retryDisabled={isGenerating}
            />
          ))}
          {Array.from({ length: pendingImageCount }, (_, index) => (
            <LoadingImageSlot
              key={`pending-image-${index}`}
              slotIndex={index}
            />
          ))}
        </div>
      )
    }

    return (
      <Empty className='h-full min-h-[360px] border-none py-0'>
        <div className='from-primary/10 via-primary/5 to-background relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm'>
          <div className='bg-primary/20 absolute -top-6 -right-6 size-12 rounded-full blur-xl' />
          <ImageIcon className='text-primary/70 relative size-8' />
          <Sparkles className='text-primary/60 absolute top-3 right-3 size-3.5' />
        </div>
        <div className='text-muted-foreground flex flex-col items-center gap-2 text-sm'>
          <p className='text-foreground text-base font-medium'>
            {t('Enter a prompt to start generating images')}
          </p>
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
      toast.warning(
        t('{{count}} images could not be packed', { count: skipped })
      )
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

  const handleOpenPreview = (image: GeneratedImage) => {
    setPreviewZoom(1)
    setPreviewRotation(0)
    setPreviewImage(image)
  }

  const handleClosePreview = () => {
    setPreviewImage(null)
    setPreviewZoom(1)
    setPreviewRotation(0)
  }

  const handleZoomIn = () => {
    setPreviewZoom((currentZoom) => Math.min(currentZoom + 0.25, 3))
  }

  const handleZoomOut = () => {
    setPreviewZoom((currentZoom) => Math.max(currentZoom - 0.25, 0.5))
  }

  const handleRotatePreview = () => {
    setPreviewRotation((currentRotation) => (currentRotation + 90) % 360)
  }

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
    setPreviewZoom((currentZoom) => {
      const zoomDelta = event.deltaY < 0 ? 0.1 : -0.1
      return Math.min(Math.max(currentZoom + zoomDelta, 0.5), 3)
    })
  }

  const handleResetPreview = () => {
    setPreviewZoom(1)
    setPreviewRotation(0)
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
              onClick={() => handleOpenPreview(image)}
            >
              <img
                src={image.src}
                alt={record.prompt.slice(0, 80)}
                loading='lazy'
                className='aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]'
              />
            </button>
            <div className='bg-background/25 absolute inset-x-0 bottom-0 hidden items-center justify-end gap-1 p-1.5 backdrop-blur-[1px] group-hover:flex'>
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
        {isGenerating &&
          Array.from({ length: pendingImageCount }, (_, index) => (
            <LoadingImageSlot
              key={`pending-image-${index}`}
              slotIndex={index}
            />
          ))}
        {(isGenerating ? imageErrors : (record.imageErrors ?? imageErrors)).map(
          (message, errorIndex) =>
            retryingImageErrorIndexes.includes(errorIndex) ? (
              <LoadingImageSlot
                key={`retrying-image-error-${message}`}
                slotIndex={record.images.length + errorIndex}
              />
            ) : (
              <ImageErrorSlot
                key={message}
                message={message}
                onRetry={() => onRetryImage(errorIndex)}
                retryDisabled={isGenerating}
              />
            )
        )}
        {!isGenerating &&
          !record.imageErrors &&
          Array.from({ length: record.failedImageCount ?? 0 }, (_, index) =>
            retryingImageErrorIndexes.includes(index) ? (
              <LoadingImageSlot
                key={`retrying-failed-image-${index}`}
                slotIndex={record.images.length + index}
              />
            ) : (
              <ImageErrorSlot
                key={`failed-image-${index}`}
                message={t('Image generation failed')}
                onRetry={() => onRetryImage(index)}
                retryDisabled={false}
              />
            )
          )}
      </div>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) handleClosePreview()
        }}
      >
        <DialogContent
          className='[&_[data-slot=dialog-close]]:bg-foreground/45 [&_[data-slot=dialog-close]]:text-background [&_[data-slot=dialog-close]]:hover:bg-foreground/60 bg-transparent p-0 shadow-none ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:backdrop-blur-md'
          overlayClassName='bg-black/30 supports-backdrop-filter:backdrop-blur-[1.5px]'
        >
          <DialogTitle className='sr-only'>{t('Image preview')}</DialogTitle>
          {previewImage && (
            <div
              className='flex h-screen w-screen min-w-0 flex-col items-center justify-center px-[4vw] py-[4vh]'
              onClick={handleClosePreview}
            >
              <div
                className='flex max-h-[calc(96vh-9rem)] w-[min(92vw,960px)] items-center justify-center overflow-hidden'
                onWheel={handlePreviewWheel}
              >
                <img
                  src={previewImage.src}
                  alt={record.prompt.slice(0, 80)}
                  className='max-h-[calc(96vh-9rem)] max-w-full rounded-lg object-contain transition-transform duration-150'
                  style={{
                    transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
              <div
                className='mt-4 flex flex-col gap-5'
                onClick={(event) => event.stopPropagation()}
              >
                {previewImage.revisedPrompt && (
                  <p className='bg-background/90 text-foreground mx-auto max-h-20 w-[min(92vw,960px)] overflow-auto rounded-lg border px-3 py-2 text-center text-xs leading-relaxed shadow-sm backdrop-blur-md'>
                    {previewImage.revisedPrompt}
                  </p>
                )}
                <div className='bg-background/95 flex flex-wrap items-center justify-center gap-1.5 rounded-full border p-1.5 shadow-sm backdrop-blur-sm sm:self-center'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={handleZoomOut}
                    disabled={previewZoom <= 0.5}
                    aria-label={t('Zoom out')}
                  >
                    <ZoomOut className='size-3.5' />
                  </Button>
                  <span className='text-muted-foreground min-w-12 text-center text-xs tabular-nums'>
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={handleZoomIn}
                    disabled={previewZoom >= 3}
                    aria-label={t('Zoom in')}
                  >
                    <ZoomIn className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={handleRotatePreview}
                    aria-label={t('Rotate')}
                  >
                    <RotateCcw className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={handleResetPreview}
                    aria-label={t('Reset view')}
                  >
                    <RefreshCw className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => void handleCopy(previewImage)}
                    aria-label={t('Copy image')}
                  >
                    <Copy className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
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
                    aria-label={t('Download')}
                  >
                    <Download className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => {
                      onEditImage(previewImage)
                      handleClosePreview()
                    }}
                    aria-label={t('Edit this image')}
                  >
                    <Pencil className='size-3.5' />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
