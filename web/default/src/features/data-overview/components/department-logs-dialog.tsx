import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import { DepartmentLogsSection } from './user-logs-section'

interface DepartmentLogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string | null
  departmentName: string
  initialStartTimestamp: number
  initialEndTimestamp: number
}

export function DepartmentLogsDialog(props: DepartmentLogsDialogProps) {
  const { t } = useTranslation()

  if (!props.departmentId) return null

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-2rem)] w-[min(1360px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-[calc(100vw-2rem)]'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>
            {t('Usage Logs')} - {props.departmentName}
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 overflow-y-auto pt-2 pr-1'>
          <DepartmentLogsSection
            departmentId={props.departmentId}
            startTimestamp={props.initialStartTimestamp}
            endTimestamp={props.initialEndTimestamp}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
