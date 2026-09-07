import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { ModelRecommendationScenario } from '../types'

const scenarioLabelKeys: Record<ModelRecommendationScenario, string> = {
  general: 'General recommendations',
  coding: 'Coding',
  chat: 'Daily chat',
  writing: 'Writing',
  image: 'Image generation',
}

type ModelRecommendationScenariosProps = {
  scenarios?: ModelRecommendationScenario[]
  compact?: boolean
}

export function ModelRecommendationScenarios(
  props: ModelRecommendationScenariosProps
) {
  const { t } = useTranslation()

  if (!props.scenarios?.length) return null

  return (
    <div
      role='list'
      aria-label={t('Scenario')}
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-1.5',
        props.compact ? 'mt-1.5' : 'mt-3 gap-2'
      )}
    >
      {props.scenarios.map((scenario) => (
        <span
          key={scenario}
          role='listitem'
          className={cn(
            'border border-amber-300/60 bg-amber-500/8 text-amber-800 dark:border-amber-700/60 dark:bg-amber-400/10 dark:text-amber-300',
            props.compact
              ? 'rounded-md px-2 py-0.5 text-xs leading-4'
              : 'rounded-md px-2.5 py-1 text-[13px] leading-4'
          )}
        >
          {t(scenarioLabelKeys[scenario])}
        </span>
      ))}
    </div>
  )
}
