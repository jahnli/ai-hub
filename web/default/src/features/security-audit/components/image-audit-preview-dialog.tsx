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
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useEffect,
  useState,
  type KeyboardEvent,
  type WheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  copyImageToClipboard,
  downloadImage,
  imageFileName,
} from '@/features/image-studio/lib/image-utils'

import type { ImageAuditPreviewTarget } from '../types'

interface ImageAuditPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ImageAuditPreviewTarget | null
}

/**
 * Fullscreen lightbox for audit images. Mirrors the image-studio result
 * preview (zoom / rotate / copy / download) and adds prev-next navigation
 * across all images of a generation, including arrow-key support.
 */
export function ImageAuditPreviewDialog(props: ImageAuditPreviewDialogProps) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (props.target) {
      setIndex(props.target.index)
      setZoom(1)
      setRotation(0)
    }
  }, [props.target])

  if (!props.target) return null

  const item = props.target.item
  const images = item.images ?? []
  if (images.length === 0) return null
  const safeIndex = Math.min(Math.max(index, 0), images.length - 1)
  const image = images[safeIndex]
  const promptText = image.revised_prompt || item.prompt

  const goTo = (nextIndex: number) => {
    const count = images.length
    setIndex(((nextIndex % count) + count) % count)
    setZoom(1)
    setRotation(0)
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
    setZoom((currentZoom) => {
      const zoomDelta = event.deltaY < 0 ? 0.1 : -0.1
      return Math.min(Math.max(currentZoom + zoomDelta, 0.5), 3)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (images.length < 2) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(safeIndex - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(safeIndex + 1)
    }
  }

  const handleCopy = async () => {
    try {
      await copyImageToClipboard(image.url)
      toast.success(t('Image copied to clipboard'))
    } catch {
      toast.error(t('Copy failed, please download instead'))
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className='bg-transparent p-0 shadow-none ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:bg-foreground/45 [&_[data-slot=dialog-close]]:text-background [&_[data-slot=dialog-close]]:backdrop-blur-md [&_[data-slot=dialog-close]]:hover:bg-foreground/60'
        overlayClassName='bg-black/30 supports-backdrop-filter:backdrop-blur-[1.5px]'
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className='sr-only'>{t('Image preview')}</DialogTitle>
        <div
          className='flex h-[96vh] w-screen min-w-0 flex-col items-center justify-start px-6 pt-4 pb-3'
          onClick={() => props.onOpenChange(false)}
        >
          <div
            className='relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden'
            onWheel={handleWheel}
          >
            {images.length > 1 && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='bg-foreground/45 text-background hover:bg-foreground/60 hover:text-background absolute left-2 z-10 rounded-full backdrop-blur-md'
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(safeIndex - 1)
                }}
                aria-label={t('Previous image')}
              >
                <ChevronLeft className='size-5' />
              </Button>
            )}
            <div className='flex h-full min-h-0 max-w-[86vw] items-center justify-center overflow-hidden'>
              <img
                src={image.url}
                alt={promptText.slice(0, 80)}
                className='max-h-none max-w-none rounded-lg object-contain transition-transform duration-150'
                style={{
                  height: `${zoom * 100}%`,
                  transform: `rotate(${rotation}deg)`,
                }}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
            {images.length > 1 && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='bg-foreground/45 text-background hover:bg-foreground/60 hover:text-background absolute right-2 z-10 rounded-full backdrop-blur-md'
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(safeIndex + 1)
                }}
                aria-label={t('Next image')}
              >
                <ChevronRight className='size-5' />
              </Button>
            )}
          </div>
          <div
            className='mt-2 flex flex-col gap-2'
            onClick={(event) => event.stopPropagation()}
          >
            {promptText && (
              <p className='text-muted-foreground mx-auto max-h-16 max-w-[min(86vw,720px)] overflow-auto text-center text-xs leading-relaxed'>
                <span className='font-medium'>{t('Prompt')}: </span>
                {promptText}
              </p>
            )}
            <div className='bg-background/95 flex flex-wrap items-center justify-center gap-1.5 rounded-full border p-1.5 shadow-sm backdrop-blur-sm sm:self-center'>
              {images.length > 1 && (
                <span className='text-muted-foreground min-w-12 text-center text-xs tabular-nums'>
                  {safeIndex + 1} / {images.length}
                </span>
              )}
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() =>
                  setZoom((currentZoom) => Math.max(currentZoom - 0.25, 0.5))
                }
                disabled={zoom <= 0.5}
                aria-label={t('Zoom out')}
              >
                <ZoomOut className='size-3.5' />
              </Button>
              <span className='text-muted-foreground min-w-12 text-center text-xs tabular-nums'>
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() =>
                  setZoom((currentZoom) => Math.min(currentZoom + 0.25, 3))
                }
                disabled={zoom >= 3}
                aria-label={t('Zoom in')}
              >
                <ZoomIn className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() =>
                  setRotation((currentRotation) => (currentRotation + 90) % 360)
                }
                aria-label={t('Rotate')}
              >
                <RotateCcw className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() => {
                  setZoom(1)
                  setRotation(0)
                }}
                aria-label={t('Reset view')}
              >
                <RefreshCw className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() => void handleCopy()}
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
                    image.url,
                    imageFileName(safeIndex, image.url, item.output_format)
                  )
                }
                aria-label={t('Download')}
              >
                <Download className='size-3.5' />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
