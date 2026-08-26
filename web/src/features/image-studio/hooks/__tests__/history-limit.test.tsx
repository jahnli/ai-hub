import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { GenerationHistoryResult } from '../../lib/storage'
import type { GenerationRecord } from '../../types'
import { useGenerationHistory } from '../use-generation-history'

const createRecord = (id: string): GenerationRecord => ({
  id,
  createdAt: Number(id.replaceAll(/\D/g, '')) || 1,
  mode: 'generate',
  prompt: `prompt-${id}`,
  model: 'test-image-model',
  group: 'default',
  size: '1024x1024',
  n: 1,
  images: [],
})

let historyResult: GenerationHistoryResult
let deletedIds: string[]
let clearCalls: number

vi.mock('../../lib/storage', () => ({
  listGenerations: async () => historyResult,
  saveGeneration: async () => undefined,
  updateGeneration: async () => undefined,
  deleteGeneration: async (id: string) => {
    deletedIds.push(id)
  },
  clearGenerations: async () => {
    clearCalls += 1
  },
}))

type HistoryHook = ReturnType<typeof useGenerationHistory>

async function renderHistoryHook(): Promise<{
  current: () => HistoryHook
  unmount: () => void
}> {
  const renderedHook = renderHook(() => useGenerationHistory())
  await waitFor(() => {
    expect(renderedHook.result.current.history).toHaveLength(2)
  })

  return {
    current: () => renderedHook.result.current,
    unmount: renderedHook.unmount,
  }
}

describe('image studio history display limit', () => {
  beforeEach(() => {
    historyResult = {
      records: [createRecord('3'), createRecord('2'), createRecord('1')],
      displayLimit: 2,
    }
    deletedIds = []
    clearCalls = 0
  })

  test('keeps only the configured number when loading and adding records', async () => {
    const rendered = await renderHistoryHook()

    expect(rendered.current().history.map((record) => record.id)).toEqual([
      '3',
      '2',
    ])

    await act(async () => {
      rendered.current().addRecord(createRecord('4'))
    })

    expect(rendered.current().history.map((record) => record.id)).toEqual([
      '4',
      '3',
    ])
    await rendered.unmount()
  })

  test('removing records updates the view through the server hide actions', async () => {
    const rendered = await renderHistoryHook()

    await act(async () => {
      rendered.current().removeRecord('3')
      await Promise.resolve()
    })
    expect(rendered.current().history.map((record) => record.id)).toEqual(['2'])
    expect(deletedIds).toEqual(['3'])

    await act(async () => {
      rendered.current().clearHistory()
      await Promise.resolve()
    })
    expect(rendered.current().history).toEqual([])
    expect(clearCalls).toBe(1)
    await rendered.unmount()
  })
})
