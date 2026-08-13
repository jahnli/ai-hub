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
import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
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

import { CUSTOM_SIZE } from '../../../constants'
import type { ImageStudioConfig } from '../../../types'
import { GPT_IMAGE_PARAMETERS } from './config'

interface GptImageParamsProps {
  config: ImageStudioConfig
  updateConfig: <Key extends keyof ImageStudioConfig>(
    key: Key,
    value: ImageStudioConfig[Key]
  ) => void
  disabled: boolean
}

export function GptImageParams(props: GptImageParamsProps) {
  const { t } = useTranslation()
  const clampImageCount = (imageCount: number) =>
    Math.min(GPT_IMAGE_PARAMETERS.maxImages, Math.max(1, imageCount))

  const renderSelect = (
    value: string,
    options: readonly string[],
    onChange: (nextValue: string) => void,
    translateOptions = false
  ) => (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue ?? '')}
      disabled={props.disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue>{translateOptions ? t(value) : value}</SelectValue>
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

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Image count')}
        </Label>
        <div className='flex w-full items-center justify-between gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() =>
              props.updateConfig('n', clampImageCount(props.config.n - 1))
            }
            disabled={props.disabled || props.config.n <= 1}
            aria-label={t('Decrease count')}
          >
            <Minus className='size-3.5' />
          </Button>
          <span className='w-8 text-center text-sm font-medium tabular-nums'>
            {props.config.n}
          </span>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() =>
              props.updateConfig('n', clampImageCount(props.config.n + 1))
            }
            disabled={
              props.disabled || props.config.n >= GPT_IMAGE_PARAMETERS.maxImages
            }
            aria-label={t('Increase count')}
          >
            <Plus className='size-3.5' />
          </Button>
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Image size')}
        </Label>
        <Select
          value={props.config.size}
          onValueChange={(value) => props.updateConfig('size', value ?? 'auto')}
          disabled={props.disabled}
        >
          <SelectTrigger className='w-full'>
            <SelectValue>
              {props.config.size === CUSTOM_SIZE
                ? t('Custom size')
                : t(props.config.size)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              <SelectItem value='auto'>{t('auto')}</SelectItem>
              {GPT_IMAGE_PARAMETERS.sizePresets.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_SIZE}>{t('Custom size')}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {props.config.size === CUSTOM_SIZE && (
          <>
            <div className='flex items-center gap-2'>
              <Input
                type='number'
                min={16}
                max={3840}
                step={16}
                value={props.config.customWidth}
                onChange={(event) =>
                  props.updateConfig(
                    'customWidth',
                    Number(event.target.value) || 0
                  )
                }
                disabled={props.disabled}
                aria-label={t('Width')}
              />
              <span className='text-muted-foreground text-xs'>×</span>
              <Input
                type='number'
                min={16}
                max={3840}
                step={16}
                value={props.config.customHeight}
                onChange={(event) =>
                  props.updateConfig(
                    'customHeight',
                    Number(event.target.value) || 0
                  )
                }
                disabled={props.disabled}
                aria-label={t('Height')}
              />
            </div>
            <p className='text-muted-foreground/70 text-[11px] leading-snug'>
              {t(
                'GPT Image 2 custom sizes must be divisible by 16, within a 1:3 to 3:1 aspect ratio, and no larger than 3840×2160 total pixels.'
              )}
            </p>
          </>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Quality')}
        </Label>
        {renderSelect(
          props.config.quality,
          GPT_IMAGE_PARAMETERS.qualityOptions,
          (value) => props.updateConfig('quality', value),
          true
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Moderation sensitivity')}
        </Label>
        {renderSelect(
          props.config.moderation,
          GPT_IMAGE_PARAMETERS.moderationOptions,
          (value) => props.updateConfig('moderation', value),
          true
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Background')}
        </Label>
        {renderSelect(
          props.config.background,
          GPT_IMAGE_PARAMETERS.backgroundOptions,
          (value) => props.updateConfig('background', value),
          true
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Output format')}
        </Label>
        {renderSelect(
          props.config.outputFormat,
          GPT_IMAGE_PARAMETERS.outputFormatOptions,
          (value) => props.updateConfig('outputFormat', value)
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Output compression')}
        </Label>
        <Input
          type='number'
          min={0}
          max={100}
          value={props.config.outputCompression ?? ''}
          placeholder='0-100'
          onChange={(event) =>
            props.updateConfig(
              'outputCompression',
              event.target.value === '' ? null : Number(event.target.value)
            )
          }
          disabled={props.disabled}
        />
      </div>
    </div>
  )
}
