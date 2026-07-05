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
import { Check, ChevronDown, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatTimestampToDate } from '@/lib/format'

import type { RequestMessage } from '../../types'
import { parseUserMessages } from '../request-messages-provider'

interface RequestContentDialogProps {
  requestMessage: RequestMessage
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
  open,
  onOpenChange,
}: RequestContentDialogProps) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const messages = parseUserMessages(requestMessage.user_content)

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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Request Content')}
      description={`${requestMessage.model_name} · ${requestMessage.relay_format} · ${formatTimestampToDate(requestMessage.created_at)}`}
      contentClassName='sm:max-w-[70rem]'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      <ScrollArea className='max-h-[70vh] pr-4'>
        <div className='space-y-3'>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            <span className='shrink-0'>{t('Request ID')}:</span>
            <span className='truncate font-mono'>
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
              <CollapsibleContent>
                <p className='bg-muted/40 border-t pl-9 pr-3 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap'>
                  {entry.message}
                </p>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {requestMessage.parameters && (
            <Collapsible className='rounded-lg border px-3 py-2'>
              <CollapsibleTrigger className='cursor-pointer text-sm font-medium'>
                {t('Request Parameters')}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className='bg-muted mt-2 max-h-[280px] overflow-auto rounded-md p-3 text-xs'>
                  {formatParameters(requestMessage.parameters)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </Dialog>
  )
}
