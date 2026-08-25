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
import { GPT_IMAGE_PARAMETERS } from './config'
import type { GptImageConfig, GptImageConfigUpdater } from './types'

interface GptImageParamsProps {
  config: GptImageConfig
  updateConfig: GptImageConfigUpdater
  disabled: boolean
}

export function GptImageParams(props: GptImageParamsProps) {
  const { t } = useTranslation()
  const clampImageCount = (imageCount: number) =>
    Math.min(
      GPT_IMAGE_PARAMETERS.runtimeLimits.maxImages,
      Math.max(1, imageCount)
    )

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
          <Input
            type='number'
            min={1}
            max={GPT_IMAGE_PARAMETERS.runtimeLimits.maxImages}
            step={1}
            value={props.config.n}
            onChange={(event) =>
              props.updateConfig(
                'n',
                clampImageCount(Number(event.target.value) || 1)
              )
            }
            disabled={props.disabled}
            className='h-8 min-w-0 flex-1 text-center font-medium tabular-nums'
            aria-label={t('Image count')}
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            onClick={() =>
              props.updateConfig('n', clampImageCount(props.config.n + 1))
            }
            disabled={
              props.disabled ||
              props.config.n >= GPT_IMAGE_PARAMETERS.runtimeLimits.maxImages
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

      {(props.config.outputFormat === 'jpeg' ||
        props.config.outputFormat === 'webp') && (
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
      )}
    </div>
  )
}
