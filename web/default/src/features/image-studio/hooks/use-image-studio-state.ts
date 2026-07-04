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

import { getUserGroups, getUserModels } from '../api'
import { DEFAULT_CONFIG, IMAGE_MODEL_KEYWORDS } from '../constants'
import { normalizeConfigForModel } from '../lib/model-params'
import type { GroupOption, ImageStudioConfig, ModelOption } from '../types'

export function isLikelyImageModel(model: string): boolean {
  const lower = model.toLowerCase()
  return IMAGE_MODEL_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function useImageStudioState() {
  const [config, setConfig] = useState<ImageStudioConfig>(() => ({
    ...DEFAULT_CONFIG,
  }))
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
        // model families support different size/quality/n subsets
        return key === 'model' ? normalizeConfigForModel(next) : next
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
        const imageModels = loaded.filter((model) =>
          isLikelyImageModel(model.value)
        )
        setModels(imageModels)
        setConfig((prev) => {
          if (
            prev.model &&
            imageModels.some((model) => model.value === prev.model)
          ) {
            return prev
          }
          const fallback = imageModels[0]
          return fallback
            ? normalizeConfigForModel({ ...prev, model: fallback.value })
            : { ...prev, model: '' }
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

  return {
    config,
    updateConfig,
    groups,
    models,
    isLoadingModels,
  }
}
