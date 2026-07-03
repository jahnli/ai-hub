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
  BACKGROUND_OPTIONS,
  CUSTOM_SIZE,
  MAX_IMAGE_COUNT,
  MODERATION_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_PRESETS,
} from '../constants'
import type {
  GroupOption,
  ImageStudioConfig,
  ModelOption,
} from '../types'

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
  placeholder,
  onChange,
  disabled,
}: {
  value: string
  options: readonly string[]
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Select
      value={value || 'unset'}
      onValueChange={(v) => onChange(v === 'unset' ? '' : (v ?? ''))}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue>{value || placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectItem value='unset'>{t('Default (not sent)')}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
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

  const clampCount = (value: number) =>
    Math.min(MAX_IMAGE_COUNT, Math.max(1, value))

  let watermarkValue = 'unset'
  let watermarkLabel = t('Default (not sent)')
  if (config.watermark !== null) {
    watermarkValue = config.watermark ? 'on' : 'off'
    watermarkLabel = config.watermark ? t('Enabled') : t('Disabled')
  }

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
          onValueChange={(value) => updateConfig('size', value ?? '1024x1024')}
          disabled={disabled}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {config.size === CUSTOM_SIZE ? t('Custom size') : config.size}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {SIZE_PRESETS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value='auto'>auto</SelectItem>
              <SelectItem value={CUSTOM_SIZE}>{t('Custom size')}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {config.size === CUSTOM_SIZE && (
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              min={16}
              max={8192}
              value={config.customWidth}
              onChange={(e) =>
                updateConfig('customWidth', Number(e.target.value) || 0)
              }
              disabled={disabled}
              aria-label={t('Width')}
            />
            <span className='text-muted-foreground text-xs'>×</span>
            <Input
              type='number'
              min={16}
              max={8192}
              value={config.customHeight}
              onChange={(e) =>
                updateConfig('customHeight', Number(e.target.value) || 0)
              }
              disabled={disabled}
              aria-label={t('Height')}
            />
          </div>
        )}
      </FieldRow>

      <FieldRow label={t('Quality')}>
        <OptionalSelect
          value={config.quality}
          options={QUALITY_OPTIONS}
          placeholder={t('Default (not sent)')}
          onChange={(value) => updateConfig('quality', value)}
          disabled={disabled}
        />
      </FieldRow>

      <FieldRow label={t('Moderation sensitivity')}>
        <OptionalSelect
          value={config.moderation}
          options={MODERATION_OPTIONS}
          placeholder={t('Default (not sent)')}
          onChange={(value) => updateConfig('moderation', value)}
          disabled={disabled}
        />
        <p className='text-muted-foreground text-[11px] leading-snug'>
          {t('Only effective for models that support it, e.g. gpt-image-1')}
        </p>
      </FieldRow>

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
            disabled={disabled || config.n >= MAX_IMAGE_COUNT}
            aria-label={t('Increase count')}
          >
            <Plus className='size-3.5' />
          </Button>
        </div>
      </FieldRow>

      <Collapsible>
        <CollapsibleTrigger className='text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium transition-colors'>
          {t('Advanced parameters')}
          <ChevronDown className='size-3.5' />
        </CollapsibleTrigger>
        <CollapsibleContent className='mt-3 flex flex-col gap-4'>
          <FieldRow label={t('Background')}>
            <OptionalSelect
              value={config.background}
              options={BACKGROUND_OPTIONS}
              placeholder={t('Default (not sent)')}
              onChange={(value) => updateConfig('background', value)}
              disabled={disabled}
            />
          </FieldRow>

          <FieldRow label={t('Output format')}>
            <OptionalSelect
              value={config.outputFormat}
              options={OUTPUT_FORMAT_OPTIONS}
              placeholder={t('Default (not sent)')}
              onChange={(value) => updateConfig('outputFormat', value)}
              disabled={disabled}
            />
          </FieldRow>

          <FieldRow label={t('Output compression (0-100)')}>
            <Input
              type='number'
              min={0}
              max={100}
              value={config.outputCompression ?? ''}
              placeholder={t('Default (not sent)')}
              onChange={(e) =>
                updateConfig(
                  'outputCompression',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              disabled={disabled}
            />
          </FieldRow>

          <FieldRow label={t('Style')}>
            <Input
              value={config.style}
              placeholder={t('e.g. vivid / natural')}
              onChange={(e) => updateConfig('style', e.target.value)}
              disabled={disabled}
            />
          </FieldRow>

          <FieldRow label={t('Watermark')}>
            <Select
              value={watermarkValue}
              onValueChange={(value) =>
                updateConfig(
                  'watermark',
                  value === 'unset' ? null : value === 'on'
                )
              }
              disabled={disabled}
            >
              <SelectTrigger className='w-full'>
                <SelectValue>{watermarkLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  <SelectItem value='unset'>
                    {t('Default (not sent)')}
                  </SelectItem>
                  <SelectItem value='on'>{t('Enabled')}</SelectItem>
                  <SelectItem value='off'>{t('Disabled')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label={t('Seed')}>
            <Input
              type='number'
              value={config.seed}
              placeholder={t('Default (not sent)')}
              onChange={(e) => updateConfig('seed', e.target.value)}
              disabled={disabled}
            />
          </FieldRow>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
