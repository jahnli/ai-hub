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
