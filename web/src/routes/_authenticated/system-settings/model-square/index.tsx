import { createFileRoute } from '@tanstack/react-router'

import { ModelSquareSettings } from '@/features/model-square-settings'

export const Route = createFileRoute(
  '/_authenticated/system-settings/model-square/'
)({
  component: ModelSquareSettings,
})
