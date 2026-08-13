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
import { useTranslation } from 'react-i18next'

import { ModelGroupSelector } from '@/components/model-group-selector'
import { Label } from '@/components/ui/label'

import { GptImageParams } from '../lib/model-params/gpt-image/params'
import { isSeedreamModel } from '../lib/model-params/seedream/config'
import { SeedreamParams } from '../lib/model-params/seedream/params'
import type { GroupOption, ImageStudioConfig, ModelOption } from '../types'

interface ParamsPanelProps {
  config: ImageStudioConfig
  updateConfig: <Key extends keyof ImageStudioConfig>(
    key: Key,
    value: ImageStudioConfig[Key]
  ) => void
  groups: GroupOption[]
  models: ModelOption[]
  isLoadingModels: boolean
  disabled: boolean
}

export function ParamsPanel(props: ParamsPanelProps) {
  const { t } = useTranslation()
  const modelParameters = isSeedreamModel(props.config.model) ? (
    <SeedreamParams
      config={props.config}
      updateConfig={props.updateConfig}
      disabled={props.disabled}
    />
  ) : (
    <GptImageParams
      config={props.config}
      updateConfig={props.updateConfig}
      disabled={props.disabled}
    />
  )

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <Label className='text-muted-foreground text-xs font-medium'>
          {t('Model')}
        </Label>
        <ModelGroupSelector
          selectedModel={props.config.model}
          models={props.models}
          onModelChange={(value) => props.updateConfig('model', value)}
          selectedGroup={props.config.group}
          groups={props.groups}
          onGroupChange={(value) => props.updateConfig('group', value)}
          disabled={props.disabled || props.isLoadingModels}
        />
      </div>
      {modelParameters}
    </div>
  )
}
