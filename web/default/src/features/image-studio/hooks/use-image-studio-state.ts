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
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getUserGroups, getUserModels } from '../api'
import { DEFAULT_CONFIG, IMAGE_MODEL_KEYWORDS } from '../constants'
import type { GroupOption, ImageStudioConfig, ModelOption } from '../types'

const CONFIG_STORAGE_KEY = 'image-studio-config'

function loadStoredConfig(): ImageStudioConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<ImageStudioConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function isLikelyImageModel(model: string): boolean {
  const lower = model.toLowerCase()
  return IMAGE_MODEL_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function useImageStudioState() {
  const [config, setConfig] = useState<ImageStudioConfig>(loadStoredConfig)
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  const updateConfig = useCallback(
    <K extends keyof ImageStudioConfig>(
      key: K,
      value: ImageStudioConfig[K]
    ) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value }
        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next))
        } catch {
          /* storage quota errors are non-fatal */
        }
        return next
      })
    },
    []
  )

  // Load groups once
  useEffect(() => {
    let cancelled = false
    getUserGroups()
      .then((loaded) => {
        if (cancelled || loaded.length === 0) return
        setGroups(loaded)
        setConfig((prev) => {
          if (loaded.some((g) => g.value === prev.group)) return prev
          return { ...prev, group: loaded[0].value }
        })
      })
      .catch(() => {
        /* group loading failure keeps the stored group */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load models when group changes
  useEffect(() => {
    let cancelled = false
    setIsLoadingModels(true)
    getUserModels(config.group)
      .then((loaded) => {
        if (cancelled) return
        setModels(loaded)
        setConfig((prev) => {
          if (prev.model && loaded.some((m) => m.value === prev.model)) {
            return prev
          }
          const imageModel = loaded.find((m) => isLikelyImageModel(m.value))
          const fallback = imageModel ?? loaded[0]
          return fallback ? { ...prev, model: fallback.value } : prev
        })
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false)
      })
      .catch(() => {
        /* model loading failure keeps the stored model */
      })
    return () => {
      cancelled = true
    }
  }, [config.group])

  // Image-capable models first, others after — user can still pick any
  const sortedModels = useMemo(() => {
    const imageModels = models.filter((m) => isLikelyImageModel(m.value))
    const otherModels = models.filter((m) => !isLikelyImageModel(m.value))
    return { imageModels, otherModels }
  }, [models])

  return {
    config,
    updateConfig,
    groups,
    models,
    sortedModels,
    isLoadingModels,
  }
}
