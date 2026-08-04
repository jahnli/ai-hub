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
import {
  clearImageStudioGenerations,
  deleteImageStudioGeneration,
  listImageStudioGenerations,
  updateImageStudioGenerationFavorite,
  updateImageStudioGenerationUsage,
} from '../api'
import { DEFAULT_HISTORY_DISPLAY_LIMIT } from '../constants'
import type { GenerationRecord, ImageStudioGenerationRecord } from '../types'

const LEGACY_DB_NAME = 'image-studio'
const STORAGE_KEY = 'image-studio.generations'

let legacyDbDeletionStarted = false

function deleteLegacyIndexedDbHistory(): void {
  if (legacyDbDeletionStarted || !window.indexedDB) return
  legacyDbDeletionStarted = true
  const request = window.indexedDB.deleteDatabase(LEGACY_DB_NAME)
  request.addEventListener('error', () => {
    legacyDbDeletionStarted = false
  })
}

function removeLegacyLocalHistory(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

function fromServerRecord(
  record: ImageStudioGenerationRecord
): GenerationRecord {
  return {
    id: record.id,
    createdAt: record.created_at,
    mode: record.mode,
    prompt: record.prompt,
    model: record.model,
    group: record.group,
    size: record.size,
    quality: record.quality || undefined,
    moderation: record.moderation || undefined,
    outputFormat: record.output_format || undefined,
    n: record.n,
    images: record.images.map((image) => ({
      id: image.id,
      src: image.url,
      storageId: image.id,
      mimeType: image.mime_type,
      sizeBytes: image.size_bytes,
      width: image.width,
      height: image.height,
      revisedPrompt: image.revised_prompt || undefined,
    })),
    failedImageCount: Math.max(0, record.n - record.images.length),
    usage: {
      durationMs: record.duration_ms,
      quota: record.quota,
      promptTokens: record.prompt_tokens,
      completionTokens: record.completion_tokens,
    },
    favorite: record.favorite,
  }
}

export interface GenerationHistoryResult {
  records: GenerationRecord[]
  displayLimit: number
}

export async function listGenerations(): Promise<GenerationHistoryResult> {
  try {
    deleteLegacyIndexedDbHistory()
    removeLegacyLocalHistory()
    const result = await listImageStudioGenerations()
    return {
      records: result.records.map(fromServerRecord),
      displayLimit: result.displayLimit,
    }
  } catch {
    return {
      records: [],
      displayLimit: DEFAULT_HISTORY_DISPLAY_LIMIT,
    }
  }
}

export async function saveGeneration(_record: GenerationRecord): Promise<void> {
  removeLegacyLocalHistory()
}

export async function updateGeneration(
  record: GenerationRecord
): Promise<void> {
  await Promise.all([
    updateImageStudioGenerationFavorite(record.id, Boolean(record.favorite)),
    updateImageStudioGenerationUsage(record.id, {
      quota: record.usage?.quota,
      promptTokens: record.usage?.promptTokens,
      completionTokens: record.usage?.completionTokens,
    }),
  ])
}

export async function deleteGeneration(id: string): Promise<void> {
  await deleteImageStudioGeneration(id)
}

export async function clearGenerations(): Promise<void> {
  removeLegacyLocalHistory()
  await clearImageStudioGenerations()
}
