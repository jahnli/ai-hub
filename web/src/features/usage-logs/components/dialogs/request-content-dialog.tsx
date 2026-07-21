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
import { useMutation } from '@tanstack/react-query'
import { Check, ChevronDown, Copy, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatTimestampToDate } from '@/lib/format'

import { notifyRequestMessageViolation } from '../../api'
import type { RequestMessage } from '../../types'
import { parseUserMessages } from '../request-messages-provider'

interface RequestContentDialogProps {
  requestMessage: RequestMessage
  userAgent?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatParameters(parameters: string): string {
  try {
    return JSON.stringify(JSON.parse(parameters), null, 2)
  } catch {
    return parameters
  }
}

export function RequestContentDialog({
  requestMessage,
  userAgent,
  open,
  onOpenChange,
}: RequestContentDialogProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const messages = parseUserMessages(requestMessage.user_content)
  const canNotifyViolation = requestMessage.user_id > 0
  const notifyViolationMutation = useMutation({
    mutationFn: async () => {
      const res = await notifyRequestMessageViolation({
        request_id: requestMessage.request_id,
        user_id: requestMessage.user_id,
        model_name: requestMessage.model_name || '',
        created_at: requestMessage.created_at || 0,
      })
      if (!res.success) {
        throw new Error(res.message || t('Failed to send violation notice'))
      }
      return res
    },
    onSuccess: () => {
      toast.success(t('Violation notice sent'))
      setConfirmOpen(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to send violation notice')
      )
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmOpen(false)
    }
    onOpenChange(nextOpen)
  }

  // 消息内容可能重复，用 内容前缀+出现次序 组成稳定 key；最新的消息排在最上面
  const seenCount = new Map<string, number>()
  const entries = messages
    .map((message, index) => {
      const occurrence = seenCount.get(message) ?? 0
      seenCount.set(message, occurrence + 1)
      return {
        key: `${occurrence}:${message.slice(0, 40)}`,
        message,
        label: index + 1,
        isLatest: index === messages.length - 1,
      }
    })
    .reverse()

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        title={t('Request Content')}
        contentClassName='sm:max-w-[78rem]'
        contentHeight='calc(100vh - 8rem)'
        bodyContainerClassName='max-h-[calc(100vh-8rem)] overflow-hidden'
        bodyClassName='h-full min-h-0'
      >
        <div className='flex h-full min-h-0 flex-col space-y-3'>
          <div className='shrink-0'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-sm'>
                <span>
                  {requestMessage.model_name} · {requestMessage.relay_format} ·{' '}
                  {formatTimestampToDate(requestMessage.created_at)}
                </span>
                <span className='text-muted-foreground/60'>·</span>
                <span className='shrink-0'>{t('Request ID')}:</span>
                <span className='max-w-[28rem] truncate font-mono'>
                  {requestMessage.request_id}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 shrink-0 p-0'
                  onClick={() => copyToClipboard(requestMessage.request_id)}
                  title={t('Copy to clipboard')}
                >
                  {copiedText === requestMessage.request_id ? (
                    <Check className='size-3 text-green-600' />
                  ) : (
                    <Copy className='size-3' />
                  )}
                </Button>
              </div>
              {canNotifyViolation && (
                <Button
                  variant='destructive'
                  size='sm'
                  className='h-8 shrink-0 gap-1.5'
                  onClick={() => setConfirmOpen(true)}
                  disabled={notifyViolationMutation.isPending}
                >
                  <ShieldAlert className='size-3.5' />
                  {t('Violation Notice')}
                </Button>
              )}
            </div>
            {userAgent && (
              <div className='text-muted-foreground mt-1 flex min-w-0 items-start gap-1 text-sm'>
                <span className='shrink-0'>{t('User-Agent')}:</span>
                <span className='min-w-0 break-all'>{userAgent}</span>
              </div>
            )}
          </div>

          <div className='grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)] md:grid-rows-[minmax(0,1fr)]'>
            <div className='h-full min-h-0 overflow-y-scroll overscroll-contain pr-3 [scrollbar-gutter:stable]'>
              <div className='space-y-3'>
                {entries.map((entry) => (
                  <Collapsible
                    key={entry.key}
                    defaultOpen
                    className='group/message rounded-lg border'
                  >
                    <div className='flex items-center gap-1 px-3 py-2'>
                      <CollapsibleTrigger className='flex flex-1 cursor-pointer items-center gap-2 text-left text-sm font-medium'>
                        <ChevronDown className='text-muted-foreground size-4 shrink-0 transition-transform group-data-[closed]/message:-rotate-90' />
                        <span>
                          {t('User message {{index}}', { index: entry.label })}
                        </span>
                        {entry.isLatest && (
                          <span className='text-muted-foreground/60 text-xs font-normal'>
                            {t('Latest')}
                          </span>
                        )}
                      </CollapsibleTrigger>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 w-7 shrink-0 p-0'
                        onClick={() => copyToClipboard(entry.message)}
                        title={t('Copy to clipboard')}
                      >
                        {copiedText === entry.message ? (
                          <Check className='size-3.5 text-green-600' />
                        ) : (
                          <Copy className='size-3.5' />
                        )}
                      </Button>
                    </div>
                    <CollapsibleContent className='CollapsibleContent'>
                      <p className='bg-muted/40 border-t py-2.5 pr-3 pl-9 text-sm leading-relaxed break-words whitespace-pre-wrap'>
                        {entry.message}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            <div className='h-full min-h-0 min-w-0 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]'>
              {requestMessage.parameters && (
                <Collapsible
                  defaultOpen
                  className='group/parameters rounded-lg border px-3 py-2'
                >
                  <CollapsibleTrigger className='flex w-full shrink-0 cursor-pointer items-center gap-2 text-left text-sm font-medium'>
                    <ChevronDown className='text-muted-foreground size-4 shrink-0 transition-transform group-data-[closed]/parameters:-rotate-90' />
                    <span>{t('Request Parameters')}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='CollapsibleContent mt-2'>
                    <pre className='bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre'>
                      {formatParameters(requestMessage.parameters)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Confirm Violation Notice')}
        desc={t('Send a violation notice to this user via Feishu?')}
        confirmText={t('Send')}
        destructive
        isLoading={notifyViolationMutation.isPending}
        handleConfirm={() => notifyViolationMutation.mutate()}
      />
    </>
  )
}
