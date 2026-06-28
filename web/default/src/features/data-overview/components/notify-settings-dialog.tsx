import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/auth-store'
import { getReportNotifySetting, updateReportNotifySetting } from '../api'

const FREQUENCY_OPTIONS = [
  { value: '1', label: 'Weekly' },
  { value: '2', label: 'Monthly' },
  { value: '3', label: 'Weekly and Monthly' },
] as const

const getFrequencyLabel = (value: string): string =>
  FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? 'Weekly'

export function NotifySettingsDialog() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isDeptLeader = useAuthStore(
    (s) => s.auth.user?.is_dept_leader === true
  )

  const [open, setOpen] = useState(false)
  const [reportEnabled, setReportEnabled] = useState(false)
  const [frequency, setFrequency] = useState('1')
  const [quotaEnabled, setQuotaEnabled] = useState(false)
  const [quotaValue, setQuotaValue] = useState('')
  const [quotaLeaveEnabled, setQuotaLeaveEnabled] = useState(false)
  const [quotaLeaveValue, setQuotaLeaveValue] = useState('')

  const settingQuery = useQuery({
    queryKey: ['report-notify-setting'],
    queryFn: getReportNotifySetting,
    enabled: open,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!settingQuery.data?.data) return
    const data = settingQuery.data.data
    setReportEnabled(data.frequency > 0)
    setFrequency(data.frequency > 0 ? String(data.frequency) : '1')
    setQuotaEnabled(data.quota > 0)
    setQuotaValue(data.quota > 0 ? String(data.quota) : '')
    setQuotaLeaveEnabled(data.quota_leave > 0)
    setQuotaLeaveValue(data.quota_leave > 0 ? String(data.quota_leave) : '')
  }, [settingQuery.data])

  const saveMutation = useMutation({
    mutationFn: updateReportNotifySetting,
    onSuccess: () => {
      toast.success(t('Settings saved'))
      queryClient.invalidateQueries({ queryKey: ['report-notify-setting'] })
      setOpen(false)
    },
    onError: () => {
      toast.error(t('Failed to save settings'))
    },
  })

  const handleSave = () => {
    const freqVal = reportEnabled ? Number(frequency) : 0
    const quotaVal = quotaEnabled ? Number(quotaValue) || 0 : 0
    const quotaLeaveVal = quotaLeaveEnabled
      ? Number(quotaLeaveValue) || 0
      : 0

    if (quotaEnabled && quotaVal <= 0) {
      toast.error(t('Quota threshold must be greater than 0'))
      return
    }
    if (quotaLeaveEnabled && quotaLeaveVal <= 0) {
      toast.error(t('Leave quota threshold must be greater than 0'))
      return
    }

    saveMutation.mutate({
      frequency: freqVal,
      quota: quotaVal,
      quota_leave: quotaLeaveVal,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className='gap-1.5'>
            <Bell className='size-3.5' />
            {t('Notification Settings')}
          </Button>
        }
      />
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Notification Settings')}</DialogTitle>
          <DialogDescription>
            {t('Configure data report and alert notifications')}
          </DialogDescription>
        </DialogHeader>

        {settingQuery.isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='text-muted-foreground size-6 animate-spin' />
          </div>
        ) : (
          <div className='space-y-5'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <div className='text-sm font-medium'>
                    {t('Data Report')}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t(
                      'Push data overview report at the selected frequency'
                    )}
                  </div>
                </div>
                <Switch
                  checked={reportEnabled}
                  onCheckedChange={setReportEnabled}
                />
              </div>
              {reportEnabled && (
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className='w-full'>
                    <SelectValue>
                      {t(getFrequencyLabel(frequency))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isDeptLeader && (
              <>
                <div className='bg-border h-px' />
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <div className='text-sm font-medium'>
                        {t('Department Over-Quota Alert')}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {t(
                          'Notify when department members daily consumption exceeds the threshold'
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={quotaEnabled}
                      onCheckedChange={setQuotaEnabled}
                    />
                  </div>
                  {quotaEnabled && (
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min={1}
                        value={quotaValue}
                        onChange={(e) => setQuotaValue(e.target.value)}
                        className='flex-1'
                        placeholder='0'
                      />
                      <span className='text-muted-foreground shrink-0 text-sm'>
                        {t('CNY')}
                      </span>
                    </div>
                  )}
                </div>

                <div className='bg-border h-px' />
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <div className='text-sm font-medium'>
                        {t('Leave Over-Quota Alert')}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {t(
                          'Notify when members on leave daily consumption exceeds the threshold'
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={quotaLeaveEnabled}
                      onCheckedChange={setQuotaLeaveEnabled}
                    />
                  </div>
                  {quotaLeaveEnabled && (
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min={1}
                        value={quotaLeaveValue}
                        onChange={(e) => setQuotaLeaveValue(e.target.value)}
                        className='flex-1'
                        placeholder='0'
                      />
                      <span className='text-muted-foreground shrink-0 text-sm'>
                        {t('CNY')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || settingQuery.isLoading}
            className='gap-1.5'
          >
            {saveMutation.isPending && (
              <Loader2 className='size-3.5 animate-spin' />
            )}
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
