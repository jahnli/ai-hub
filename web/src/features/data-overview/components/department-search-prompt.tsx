import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'

export function DepartmentSearchPrompt() {
  const { t } = useTranslation()

  return (
    <div role='status'>
      <EmptyState
        icon={Search}
        title={t('Click Search')}
        description={t('View statistics for the selected department')}
        bordered
      />
    </div>
  )
}
