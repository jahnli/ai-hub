/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { getRequestMessages } from '../api'
import type { RequestMessage } from '../types'

const RequestMessagesContext = createContext<Map<string, RequestMessage>>(
  new Map()
)

interface RequestMessagesProviderProps {
  requestIds: string[]
  canViewRequestContent: boolean
  isAdmin: boolean
  children: ReactNode
}

/**
 * Batch-fetches the recorded user prompts for all logs on the current page
 * (one request per page instead of one per row) and exposes them as a
 * request_id -> RequestMessage map.
 */
export function RequestMessagesProvider({
  requestIds,
  canViewRequestContent,
  isAdmin,
  children,
}: RequestMessagesProviderProps) {
  const ids = useMemo(
    () => [...new Set(requestIds.filter(Boolean))].sort(),
    [requestIds]
  )

  const { data } = useQuery({
    queryKey: ['request-messages', isAdmin, ids],
    queryFn: () => getRequestMessages(ids, isAdmin),
    enabled: canViewRequestContent && ids.length > 0,
    staleTime: 60 * 1000,
  })

  const messagesById = useMemo(() => {
    const map = new Map<string, RequestMessage>()
    for (const message of data?.data ?? []) {
      map.set(message.request_id, message)
    }
    return map
  }, [data])

  return (
    <RequestMessagesContext.Provider value={messagesById}>
      {children}
    </RequestMessagesContext.Provider>
  )
}

export function useRequestMessage(
  requestId: string | undefined
): RequestMessage | undefined {
  const messagesById = useContext(RequestMessagesContext)
  return requestId ? messagesById.get(requestId) : undefined
}

/** Parses the JSON-encoded user_content column into a message list. */
export function parseUserMessages(userContent: string): string[] {
  try {
    const parsed = JSON.parse(userContent)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string')
    }
  } catch {
    /* fall through */
  }
  return []
}
