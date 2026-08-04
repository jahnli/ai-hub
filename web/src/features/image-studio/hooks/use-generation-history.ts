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
import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_HISTORY_DISPLAY_LIMIT } from '../constants'
import {
  clearGenerations,
  deleteGeneration,
  listGenerations,
  saveGeneration,
  updateGeneration,
} from '../lib/storage'
import type { GenerationRecord } from '../types'

export function useGenerationHistory() {
  const [history, setHistory] = useState<GenerationRecord[]>([])
  const [displayLimit, setDisplayLimit] = useState(
    DEFAULT_HISTORY_DISPLAY_LIMIT
  )
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  useEffect(() => {
    let cancelled = false
    listGenerations()
      .then((result) => {
        if (!cancelled) {
          setDisplayLimit(result.displayLimit)
          setHistory(result.records.slice(0, result.displayLimit))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false)
      })
      .catch(() => {
        /* unreadable history starts empty */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const addRecord = useCallback(
    (record: GenerationRecord) => {
      setHistory((prev) => [record, ...prev].slice(0, displayLimit))
      void saveGeneration(record)
    },
    [displayLimit]
  )

  const patchRecord = useCallback(
    (id: string, patch: Partial<GenerationRecord>) => {
      setHistory((prev) => {
        const next = prev.map((record) =>
          record.id === id ? { ...record, ...patch } : record
        )
        const updated = next.find((record) => record.id === id)
        if (updated) void updateGeneration(updated)
        return next
      })
    },
    []
  )

  const removeRecord = useCallback((id: string) => {
    setHistory((prev) => prev.filter((record) => record.id !== id))
    void deleteGeneration(id)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    void clearGenerations()
  }, [])

  const toggleFavorite = useCallback(
    (id: string) => {
      const record = history.find((r) => r.id === id)
      if (record) patchRecord(id, { favorite: !record.favorite })
    },
    [history, patchRecord]
  )

  return {
    history,
    isLoadingHistory,
    addRecord,
    patchRecord,
    removeRecord,
    clearHistory,
    toggleFavorite,
  }
}
