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
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import { GeneratePanel } from './components/generate-panel'
import { HistoryPanel } from './components/history-panel'
import { ParamsPanel } from './components/params-panel'
import { ResultGrid } from './components/result-grid'
import { CUSTOM_SIZE, MAX_IMAGE_COUNT } from './constants'
import {
  useGenerationHistory,
  useImageGeneration,
  useImageStudioState,
} from './hooks'
import type {
  GeneratedImage,
  GenerationRecord,
  ReferenceImage,
  StudioMode,
} from './types'

export function ImageStudio() {
  const { t } = useTranslation()
  const { config, updateConfig, groups, models, isLoadingModels } =
    useImageStudioState()
  const {
    history,
    addRecord,
    patchRecord,
    removeRecord,
    clearHistory,
    toggleFavorite,
  } = useGenerationHistory()
  const {
    isGenerating,
    generationError,
    setGenerationError,
    activeRecordId,
    setActiveRecordId,
    estimateDurationMs,
    generate,
    stopGeneration,
  } = useImageGeneration({ history, addRecord, patchRecord })

  const [mode, setMode] = useState<StudioMode>('generate')
  const [prompt, setPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])

  const activeRecord = useMemo(
    () => history.find((record) => record.id === activeRecordId) ?? null,
    [history, activeRecordId]
  )

  const customSizeWidth = config.customWidth
  const customSizeHeight = config.customHeight
  const customSizeAspectRatio = customSizeWidth / customSizeHeight
  const customSizePixelCount = customSizeWidth * customSizeHeight
  const isGptImage2Model = config.model.toLowerCase().startsWith('gpt-image-2')
  const customSizeValid =
    config.size !== CUSTOM_SIZE ||
    (customSizeWidth > 0 &&
      customSizeHeight > 0 &&
      (!isGptImage2Model ||
        (customSizeWidth % 16 === 0 &&
          customSizeHeight % 16 === 0 &&
          customSizeAspectRatio >= 1 / 3 &&
          customSizeAspectRatio <= 3 &&
          customSizeWidth <= 3840 &&
          customSizeHeight <= 3840 &&
          customSizePixelCount <= 3840 * 2160)))

  const imageCountValid = config.n >= 1 && config.n <= MAX_IMAGE_COUNT

  const canGenerate =
    !isGenerating &&
    Boolean(config.model) &&
    prompt.trim().length > 0 &&
    customSizeValid &&
    imageCountValid &&
    (mode === 'generate' || referenceImages.length > 0)

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return
    setActiveRecordId(null)
    setGenerationError(null)
    void generate({
      config,
      prompt: prompt.trim(),
      mode,
      referenceImages,
    })
  }, [
    canGenerate,
    setActiveRecordId,
    setGenerationError,
    generate,
    config,
    prompt,
    mode,
    referenceImages,
  ])

  const handleRestore = useCallback(
    (record: GenerationRecord) => {
      setActiveRecordId(record.id)
      setGenerationError(null)
      setPrompt(record.prompt)
      setMode(record.mode)
      setReferenceImages(record.referenceImages ?? [])
      updateConfig('model', record.model)
    },
    [setActiveRecordId, setGenerationError, updateConfig]
  )

  const handleEditImage = useCallback((image: GeneratedImage) => {
    setMode('edit')
    setReferenceImages([
      {
        id: `${Date.now()}-edit`,
        dataUrl: image.src,
        name: 'generated-image',
      },
    ])
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (id === activeRecordId) setActiveRecordId(null)
      removeRecord(id)
    },
    [activeRecordId, removeRecord, setActiveRecordId]
  )

  const handleClear = useCallback(() => {
    setActiveRecordId(null)
    clearHistory()
  }, [clearHistory, setActiveRecordId])

  return (
    <div className='flex size-full min-h-0 flex-col gap-4 p-4 lg:grid lg:h-full lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:gap-0 lg:p-0'>
      {/* Params panel */}
      <ScrollArea className='min-h-0 rounded-lg border p-3 lg:relative lg:h-full lg:rounded-none lg:border-0 lg:p-4 lg:after:absolute lg:after:top-1.5 lg:after:right-0 lg:after:bottom-1.5 lg:after:w-px lg:after:bg-border'>
        <ParamsPanel
          config={config}
          updateConfig={updateConfig}
          groups={groups}
          models={models}
          isLoadingModels={isLoadingModels}
          disabled={isGenerating}
        />
      </ScrollArea>

      {/* Workspace */}
      <div className='flex min-h-0 flex-col gap-4 lg:overflow-hidden lg:p-4'>
        <GeneratePanel
          mode={mode}
          onModeChange={setMode}
          prompt={prompt}
          onPromptChange={setPrompt}
          referenceImages={referenceImages}
          onReferenceImagesChange={setReferenceImages}
          isGenerating={isGenerating}
          estimateMs={estimateDurationMs(config.model)}
          onGenerate={handleGenerate}
          onStop={stopGeneration}
          canGenerate={canGenerate}
        />
        <Separator />
        <ScrollArea className='min-h-0 flex-1'>
          <ResultGrid
            record={activeRecord}
            error={generationError}
            onRetry={handleGenerate}
            onEditImage={handleEditImage}
            isGenerating={isGenerating}
          />
        </ScrollArea>
      </div>

      {/* History */}
      <div className='min-h-64 rounded-lg border p-3 lg:relative lg:h-full lg:min-h-0 lg:rounded-none lg:border-0 lg:p-4 lg:before:absolute lg:before:top-1.5 lg:before:bottom-1.5 lg:before:left-0 lg:before:w-px lg:before:bg-border'>
        <HistoryPanel
          history={history}
          activeRecordId={activeRecordId}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onClear={handleClear}
          onToggleFavorite={toggleFavorite}
          disabled={isGenerating}
        />
      </div>
      <span className='sr-only'>{t('Online Image Generation')}</span>
    </div>
  )
}
