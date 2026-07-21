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
import { ImagePlus, Loader2, Wand2, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { MAX_REFERENCE_IMAGES } from '../constants'
import { fileToDataUrl } from '../lib/image-utils'
import type { ReferenceImage, StudioMode } from '../types'
import { PromptPresets } from './prompt-presets'

type GeneratePanelProps = {
  mode: StudioMode
  onModeChange: (mode: StudioMode) => void
  prompt: string
  onPromptChange: (prompt: string) => void
  referenceImages: ReferenceImage[]
  onReferenceImagesChange: (images: ReferenceImage[]) => void
  isGenerating: boolean
  estimateMs: number
  onGenerate: () => void
  onStop: () => void
  onReset: () => void
  canGenerate: boolean
  canReset: boolean
}

export function GeneratePanel({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  referenceImages,
  onReferenceImagesChange,
  isGenerating,
  estimateMs,
  onGenerate,
  onStop,
  onReset,
  canGenerate,
  canReset,
}: GeneratePanelProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (!isGenerating) {
      setElapsedMs(0)
      return
    }
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 100)
    return () => window.clearInterval(timer)
  }, [isGenerating])

  const addFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length === 0) return
      const remaining = MAX_REFERENCE_IMAGES - referenceImages.length
      if (remaining <= 0) {
        toast.error(
          t('At most {{count}} reference images', {
            count: MAX_REFERENCE_IMAGES,
          })
        )
        return
      }
      const accepted = imageFiles.slice(0, remaining)
      const loaded = await Promise.all(
        accepted.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dataUrl: await fileToDataUrl(file),
          name: file.name,
        }))
      )
      onReferenceImagesChange([...referenceImages, ...loaded])
    },
    [referenceImages, onReferenceImagesChange, t]
  )

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    if (mode !== 'edit') return
    void addFiles([...event.dataTransfer.files])
  }

  const handlePaste = (event: ClipboardEvent) => {
    if (mode !== 'edit') return
    const files = [...event.clipboardData.files]
    if (files.length > 0) {
      event.preventDefault()
      void addFiles(files)
    }
  }

  const progressValue = isGenerating
    ? Math.min((elapsedMs / Math.max(estimateMs, 1000)) * 100, 95)
    : 0

  return (
    <div
      className='flex flex-col gap-3'
      onDragOver={(e) => {
        if (mode === 'edit') {
          e.preventDefault()
          setIsDragOver(true)
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Tabs
          value={mode}
          onValueChange={(value) => onModeChange(value as StudioMode)}
        >
          <TabsList>
            <TabsTrigger value='generate' disabled={isGenerating}>
              {t('Text to image')}
            </TabsTrigger>
            <TabsTrigger value='edit' disabled={isGenerating}>
              {t('Image to image')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <PromptPresets onSelect={onPromptChange} disabled={isGenerating} />
      </div>

      {mode === 'edit' && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 transition-colors',
            isDragOver && 'border-primary bg-primary/5'
          )}
        >
          {referenceImages.map((image) => (
            <div key={image.id} className='group relative'>
              <img
                src={image.dataUrl}
                alt={image.name}
                className='size-16 rounded-md object-cover'
              />
              <button
                type='button'
                onClick={() =>
                  onReferenceImagesChange(
                    referenceImages.filter((item) => item.id !== image.id)
                  )
                }
                className='bg-background/80 absolute -top-1.5 -right-1.5 hidden rounded-full border p-0.5 group-hover:block'
                aria-label={t('Remove reference image')}
              >
                <X className='size-3' />
              </button>
            </div>
          ))}
          {referenceImages.length < MAX_REFERENCE_IMAGES && (
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className='text-muted-foreground hover:border-primary hover:text-primary flex size-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] transition-colors'
            >
              <ImagePlus className='size-4' />
              {t('Upload')}
            </button>
          )}
          <p className='text-muted-foreground ml-1 text-[11px]'>
            {t('Click, drag or paste images here')}
          </p>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            multiple
            hidden
            onChange={(e) => {
              void addFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>
      )}

      <div className='relative'>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
              e.preventDefault()
              onGenerate()
            }
          }}
          placeholder={t('Describe the image you want to generate...')}
          className='min-h-28 resize-y pr-14'
          disabled={isGenerating}
        />
        <span className='text-muted-foreground absolute right-2 bottom-2 text-[10px] tabular-nums'>
          {prompt.length}
        </span>
      </div>

      {isGenerating && (
        <div className='flex flex-col gap-1.5'>
          <Progress value={progressValue} />
          <p className='text-muted-foreground text-xs tabular-nums'>
            {t('Waited {{elapsed}}s', {
              elapsed: Math.floor(elapsedMs / 1000),
            })}
          </p>
        </div>
      )}

      <div className='flex items-center justify-end gap-2'>
        {isGenerating ? (
          <Button
            type='button'
            variant='outline'
            className='border-destructive/25 text-destructive hover:bg-destructive/10 gap-1.5'
            onClick={onStop}
          >
            <Loader2 className='size-3.5 animate-spin' />
            {t('Stop')}
          </Button>
        ) : (
          <Button
            type='button'
            className='gap-1.5'
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            <Wand2 className='size-4' />
            {t('Generate')}
          </Button>
        )}
        {canReset && !isGenerating && (
          <Button type='button' variant='ghost' size='sm' onClick={onReset}>
            {t('Reset')}
          </Button>
        )}
      </div>
    </div>
  )
}
