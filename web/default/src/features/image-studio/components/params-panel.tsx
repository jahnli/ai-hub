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
import { ChevronDown, Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ModelGroupSelector } from '@/components/model-group-selector'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  CUSTOM_SIZE,
  MODERATION_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
} from '../constants'
import { imageModelParamSupport } from '../lib/model-params'
import type { GroupOption, ImageStudioConfig, ModelOption } from '../types'

type ParamsPanelProps = {
  config: ImageStudioConfig
  updateConfig: <K extends keyof ImageStudioConfig>(
    key: K,
    value: ImageStudioConfig[K]
  ) => void
  groups: GroupOption[]
  models: ModelOption[]
  isLoadingModels: boolean
  disabled: boolean
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-muted-foreground text-xs font-medium'>
        {label}
      </Label>
      {children}
    </div>
  )
}

function OptionalSelect({
  value,
  options,
  onChange,
  disabled,
  translateOptions = false,
}: {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  disabled?: boolean
  translateOptions?: boolean
}) {
  const { t } = useTranslation()
  const displayValue = value || 'auto'
  return (
    <Select
      value={displayValue}
      onValueChange={(nextValue) => onChange(nextValue ?? 'auto')}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue>
          {translateOptions ? t(displayValue) : displayValue}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {translateOptions ? t(option) : option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function ParamsPanel({
  config,
  updateConfig,
  groups,
  models,
  isLoadingModels,
  disabled,
}: ParamsPanelProps) {
  const { t } = useTranslation()

  const support = imageModelParamSupport(config.model)
  const showAdvanced =
    support.backgroundOptions !== null || support.supportsOutputFormat

  const clampCount = (value: number) =>
    Math.min(support.maxImages, Math.max(1, value))

  const customSizeHelpText = t(
    'GPT Image 2 custom sizes must be divisible by 16, within a 1:3 to 3:1 aspect ratio, and no larger than 3840×2160 total pixels.'
  )

  return (
    <div className='flex flex-col gap-4'>
      <FieldRow label={t('Model')}>
        <ModelGroupSelector
          selectedModel={config.model}
          models={models}
          onModelChange={(value) => updateConfig('model', value)}
          selectedGroup={config.group}
          groups={groups}
          onGroupChange={(value) => updateConfig('group', value)}
          disabled={disabled || isLoadingModels}
        />
      </FieldRow>

      <FieldRow label={t('Image size')}>
        <Select
          value={config.size}
          onValueChange={(value) => updateConfig('size', value ?? 'auto')}
          disabled={disabled}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {config.size === CUSTOM_SIZE ? t('Custom size') : t(config.size)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {support.supportsAutoSize && (
                <SelectItem value='auto'>{t('auto')}</SelectItem>
              )}
              {support.sizePresets.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
              {support.supportsCustomSize && (
                <SelectItem value={CUSTOM_SIZE}>{t('Custom size')}</SelectItem>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        {config.size === CUSTOM_SIZE && (
          <>
            <div className='flex items-center gap-2'>
              <Input
                type='number'
                min={16}
                max={3840}
                step={16}
                value={config.customWidth}
                onChange={(event) =>
                  updateConfig('customWidth', Number(event.target.value) || 0)
                }
                disabled={disabled}
                aria-label={t('Width')}
              />
              <span className='text-muted-foreground text-xs'>×</span>
              <Input
                type='number'
                min={16}
                max={3840}
                step={16}
                value={config.customHeight}
                onChange={(event) =>
                  updateConfig('customHeight', Number(event.target.value) || 0)
                }
                disabled={disabled}
                aria-label={t('Height')}
              />
            </div>
            <p className='text-muted-foreground/70 text-[11px] leading-snug'>
              {customSizeHelpText}
            </p>
          </>
        )}
      </FieldRow>

      {support.qualityOptions !== null && (
        <FieldRow label={t('Quality')}>
          <OptionalSelect
            value={config.quality}
            options={support.qualityOptions}
            onChange={(value) => updateConfig('quality', value)}
            disabled={disabled}
            translateOptions
          />
        </FieldRow>
      )}

      {support.supportsModeration && (
        <FieldRow label={t('Moderation sensitivity')}>
          <OptionalSelect
            value={config.moderation}
            options={MODERATION_OPTIONS}
            onChange={(value) => updateConfig('moderation', value)}
            disabled={disabled}
            translateOptions
          />
        </FieldRow>
      )}

      <FieldRow label={t('Image count')}>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => updateConfig('n', clampCount(config.n - 1))}
            disabled={disabled || config.n <= 1}
            aria-label={t('Decrease count')}
          >
            <Minus className='size-3.5' />
          </Button>
          <span className='w-8 text-center text-sm font-medium tabular-nums'>
            {config.n}
          </span>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() => updateConfig('n', clampCount(config.n + 1))}
            disabled={disabled || config.n >= support.maxImages}
            aria-label={t('Increase count')}
          >
            <Plus className='size-3.5' />
          </Button>
        </div>
        <p className='text-muted-foreground/70 text-[11px] leading-snug'>
          {t('Up to {{count}} images per generation', {
            count: support.maxImages,
          })}
        </p>
      </FieldRow>

      {showAdvanced && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className='text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium transition-colors'>
            {t('Advanced parameters')}
            <ChevronDown className='size-3.5' />
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-3 flex flex-col gap-4'>
            {support.backgroundOptions !== null && (
              <FieldRow label={t('Background')}>
                <OptionalSelect
                  value={config.background}
                  options={support.backgroundOptions}
                  onChange={(value) => updateConfig('background', value)}
                  disabled={disabled}
                  translateOptions
                />
              </FieldRow>
            )}

            {support.supportsOutputFormat && (
              <>
                <FieldRow label={t('Output format')}>
                  <OptionalSelect
                    value={config.outputFormat}
                    options={OUTPUT_FORMAT_OPTIONS}
                    onChange={(value) => updateConfig('outputFormat', value)}
                    disabled={disabled}
                  />
                </FieldRow>

                <FieldRow label={t('Output compression')}>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    value={config.outputCompression ?? ''}
                    placeholder='0-100'
                    onChange={(event) =>
                      updateConfig(
                        'outputCompression',
                        event.target.value === ''
                          ? null
                          : Number(event.target.value)
                      )
                    }
                    disabled={disabled}
                  />
                </FieldRow>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
