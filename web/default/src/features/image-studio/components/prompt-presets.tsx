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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
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
            {t('Prompt presets')}
          </Button>
        }
      />
      <PopoverContent className='w-[min(92vw,560px)] p-0' align='start'>
        <div className='flex flex-wrap gap-1 border-b p-2'>
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
        <ScrollArea className='max-h-72'>
          <div className='flex flex-col gap-1 p-2'>
            {active?.prompts.map((prompt) => (
              <button
                key={prompt}
                type='button'
                onClick={() => {
                  onSelect(prompt)
                  setOpen(false)
                }}
                className='hover:bg-muted rounded-md p-2 text-left text-xs leading-relaxed transition-colors'
              >
                {prompt}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
