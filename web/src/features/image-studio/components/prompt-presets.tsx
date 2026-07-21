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
import { Lightbulb } from 'lucide-react'
import { type WheelEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { PROMPT_PRESETS } from '../constants'

type PromptPresetsProps = {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function PromptPresets({ onSelect, disabled }: PromptPresetsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)

  const active = PROMPT_PRESETS[activeCategory]

  function handlePromptListWheel(event: WheelEvent<HTMLDivElement>) {
    event.stopPropagation()

    event.currentTarget.scrollTop += event.deltaY
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={disabled}
            className='gap-1.5'
          >
            <Lightbulb className='size-3.5' />
            {t('Prompt reference')}
          </Button>
        }
      />
      <PopoverContent
        className='max-h-[min(80vh,28rem)] w-[min(92vw,560px)] gap-0 overflow-hidden p-0'
        align='start'
      >
        <div className='flex shrink-0 flex-wrap gap-1 border-b p-2'>
          {PROMPT_PRESETS.map((preset, index) => (
            <button
              key={preset.category}
              type='button'
              onClick={() => setActiveCategory(index)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                index === activeCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {t(preset.category)}
            </button>
          ))}
        </div>
        <div
          className='max-h-[min(68vh,22rem)] overflow-y-auto overscroll-contain'
          onWheel={handlePromptListWheel}
        >
          <div className='flex flex-col gap-1 p-2'>
            {active?.prompts.map((prompt) => (
              <button
                key={prompt}
                type='button'
                onClick={() => {
                  onSelect(t(prompt))
                  setOpen(false)
                }}
                className='hover:bg-muted rounded-md p-2 text-left text-xs leading-relaxed transition-colors'
              >
                {t(prompt)}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
