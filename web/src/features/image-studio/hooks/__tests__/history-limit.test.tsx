// @ts-expect-error Bun supplies this module at test runtime without @types/bun.
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { Window } from 'happy-dom'
import type { ReactNode } from 'react'

import type { GenerationHistoryResult } from '../../lib/storage'
import type { GenerationRecord } from '../../types'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Element',
  'Event',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

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

mock.module('../../lib/storage', () => ({
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

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { useGenerationHistory } = await import('../use-generation-history')

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type HistoryHook = ReturnType<typeof useGenerationHistory>

async function renderHistoryHook(): Promise<{
  current: () => HistoryHook
  unmount: () => Promise<void>
}> {
  let latest: HistoryHook | null = null
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  function Harness(): ReactNode {
    latest = useGenerationHistory()
    return null
  }

  await act(async () => {
    root.render(<Harness />)
    await Promise.resolve()
  })

  return {
    current: () => {
      if (!latest) throw new Error('history hook did not render')
      return latest
    },
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
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

  afterAll(() => {
    domWindow.close()
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
