import { act, renderHook } from '@testing-library/react'
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
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { ImageRequestResult } from '../../api'
import type {
  GenerationRecord,
  ImageStudioConfig,
  ImageStudioGenerationRecord,
} from '../../types'
import { useImageGeneration } from '../use-image-studio'

interface DeferredRequest {
  promise: Promise<ImageRequestResult>
  resolve: (result: ImageRequestResult) => void
  reject: (error: unknown) => void
}

function createDeferredRequest(): DeferredRequest {
  let resolveRequest: ((result: ImageRequestResult) => void) | null = null
  let rejectRequest: ((error: unknown) => void) | null = null
  const promise = new Promise<ImageRequestResult>((resolve, reject) => {
    resolveRequest = resolve
    rejectRequest = reject
  })
  return {
    promise,
    resolve: (result) => {
      if (!resolveRequest) throw new Error('request resolver is unavailable')
      resolveRequest(result)
    },
    reject: (error) => {
      if (!rejectRequest) throw new Error('request rejecter is unavailable')
      rejectRequest(error)
    },
  }
}

const pendingRequests: DeferredRequest[] = []
let storedGeneration: ImageStudioGenerationRecord
let storeError: Error | null = null
let storePromise: Promise<ImageStudioGenerationRecord> | null = null
let resolveStorePromise:
  | ((record: ImageStudioGenerationRecord) => void)
  | null = null
let storeCallCount = 0
let appendCallCount = 0

vi.mock('../../api', () => ({
  appendImageStudioGenerationImage: async () => {
    appendCallCount += 1
    return storedGeneration
  },
  editImages: () => {
    throw new Error('editImages should not be called')
  },
  fetchGenerationLog: async () => null,
  generateImages: () => {
    const deferredRequest = createDeferredRequest()
    pendingRequests.push(deferredRequest)
    return deferredRequest.promise
  },
  storeImageStudioGeneration: async () => {
    storeCallCount += 1
    if (storeError) {
      const currentStoreError = storeError
      storeError = null
      throw currentStoreError
    }
    if (storePromise) return storePromise
    return {
      ...storedGeneration,
      images: [storedGeneration.images[0]],
    }
  },
}))

vi.mock('../../lib/model-params', () => ({
  buildImageGenerationPayload: (config: ImageStudioConfig, prompt: string) => ({
    model: config.model,
    group: config.group,
    prompt,
    output_format: 'png',
  }),
  getImageModelRuntimeLimits: () => ({
    maxImages: 4,
    maxReferenceImages: 1,
    maxTotalImages: null,
    usesGenerationEndpointForEdits: false,
  }),
  restoreParametersFromRecord: (record: GenerationRecord) =>
    record.parameterSnapshot ?? config.parameters,
  resolveParameterSize: (parameters: ImageStudioConfig['parameters']) =>
    parameters.size,
}))

type ImageGenerationHook = ReturnType<typeof useImageGeneration>

const config: ImageStudioConfig = {
  group: 'default',
  model: 'gpt-image-test-model',
  parameters: {
    family: 'gpt-image',
    size: '1024x1024',
    customWidth: 1024,
    customHeight: 1024,
    quality: 'auto',
    moderation: 'auto',
    n: 2,
    background: 'auto',
    outputFormat: 'png',
    outputCompression: null,
  },
}

function renderGenerationHook(callbacks: {
  addRecord: (record: GenerationRecord) => void
  patchRecordLocally: (id: string, patch: Partial<GenerationRecord>) => void
}): {
  current: () => ImageGenerationHook
  unmount: () => void
} {
  const renderedHook = renderHook(() =>
    useImageGeneration({
      history: [],
      addRecord: callbacks.addRecord,
      patchRecordLocally: callbacks.patchRecordLocally,
      patchRecord: () => undefined,
    })
  )

  return {
    current: () => renderedHook.result.current,
    unmount: renderedHook.unmount,
  }
}

describe('image studio generation progress', () => {
  beforeEach(() => {
    pendingRequests.length = 0
    storeError = null
    storePromise = null
    resolveStorePromise = null
    storeCallCount = 0
    appendCallCount = 0
    storedGeneration = {
      id: 'stored-generation',
      created_at: 1,
      mode: 'generate',
      prompt: 'progressive result',
      model: config.model,
      group: config.group,
      size: config.parameters.size,
      output_format: 'png',
      n: 2,
      duration_ms: 100,
      images: [
        {
          id: 'stored-image-1',
          url: '/api/image-studio/assets/stored-image-1',
          mime_type: 'image/png',
          size_bytes: 100,
        },
        {
          id: 'stored-image-2',
          url: '/api/image-studio/assets/stored-image-2',
          mime_type: 'image/png',
          size_bytes: 100,
        },
      ],
    }
  })

  test('shows the first successful image while later requests are pending', async () => {
    const addedRecords: GenerationRecord[] = []
    const localPatches: Array<Partial<GenerationRecord>> = []
    const rendered = await renderGenerationHook({
      addRecord: (record) => addedRecords.push(record),
      patchRecordLocally: (_id, patch) => localPatches.push(patch),
    })

    let generationPromise: Promise<GenerationRecord | null> | null = null
    await act(async () => {
      generationPromise = rendered.current().generate({
        config,
        prompt: 'progressive result',
        mode: 'generate',
        referenceImages: [],
      })
      await Promise.resolve()
    })

    expect(pendingRequests).toHaveLength(2)

    await act(async () => {
      pendingRequests[0].resolve({
        response: { data: [{ url: 'https://example.com/first.png' }] },
        requestId: 'request-1',
      })
      await Promise.resolve()
    })

    expect(addedRecords).toHaveLength(1)
    expect(addedRecords[0].images.map((image) => image.src)).toEqual([
      '/api/image-studio/assets/stored-image-1',
    ])
    expect(rendered.current().activeRecordId).toBe(addedRecords[0].id)
    expect(rendered.current().isGenerating).toBe(true)
    expect(rendered.current().pendingImageCount).toBe(1)
    expect(storeCallCount).toBe(1)

    await act(async () => {
      pendingRequests[1].resolve({
        response: { data: [{ url: 'https://example.com/second.png' }] },
        requestId: 'request-2',
      })
      await generationPromise
    })

    expect(localPatches.some((patch) => patch.images?.length === 2)).toBe(true)
    expect(storeCallCount).toBe(1)
    expect(rendered.current().isGenerating).toBe(false)
    await rendered.unmount()
  })

  test('waits for persistence before showing the first image', async () => {
    storePromise = new Promise<ImageStudioGenerationRecord>((resolve) => {
      resolveStorePromise = resolve
    })
    const addedRecords: GenerationRecord[] = []
    const rendered = await renderGenerationHook({
      addRecord: (record) => addedRecords.push(record),
      patchRecordLocally: () => undefined,
    })

    let generationPromise: Promise<GenerationRecord | null> | null = null
    await act(async () => {
      generationPromise = rendered.current().generate({
        config,
        prompt: 'persist before display',
        mode: 'generate',
        referenceImages: [],
      })
      await Promise.resolve()
    })

    await act(async () => {
      pendingRequests[0].resolve({
        response: { data: [{ url: 'https://example.com/first.png' }] },
        requestId: 'request-1',
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(storeCallCount).toBe(1)
    expect(addedRecords).toHaveLength(0)
    expect(rendered.current().isGenerating).toBe(true)

    await act(async () => {
      if (!resolveStorePromise) {
        throw new Error('store promise resolver is unavailable')
      }
      resolveStorePromise({
        ...storedGeneration,
        images: [storedGeneration.images[0]],
      })
      await Promise.resolve()
    })

    expect(addedRecords).toHaveLength(1)
    expect(addedRecords[0].images[0].src).toBe(
      '/api/image-studio/assets/stored-image-1'
    )

    await act(async () => {
      pendingRequests[1].resolve({
        response: { data: [{ url: 'https://example.com/second.png' }] },
        requestId: 'request-2',
      })
      await generationPromise
    })
    await rendered.unmount()
  })

  test('keeps successful images when another request fails', async () => {
    storedGeneration = {
      ...storedGeneration,
      images: [storedGeneration.images[0]],
    }
    const addedRecords: GenerationRecord[] = []
    const rendered = await renderGenerationHook({
      addRecord: (record) => addedRecords.push(record),
      patchRecordLocally: () => undefined,
    })

    let generationPromise: Promise<GenerationRecord | null> | null = null
    await act(async () => {
      generationPromise = rendered.current().generate({
        config,
        prompt: 'partial success',
        mode: 'generate',
        referenceImages: [],
      })
      await Promise.resolve()
    })

    await act(async () => {
      pendingRequests[0].reject(
        new Error('proxyconnect tcp: unsupported image URL host')
      )
      await Promise.resolve()
    })

    expect(rendered.current().imageErrors).toEqual([
      'proxyconnect tcp: unsupported image URL host',
    ])
    expect(rendered.current().pendingImageCount).toBe(1)

    await act(async () => {
      pendingRequests[1].resolve({
        response: { data: [{ url: 'https://example.com/success.png' }] },
        requestId: 'request-success',
      })
      await generationPromise
    })

    expect(addedRecords[0].images[0].src).toBe(
      '/api/image-studio/assets/stored-image-1'
    )
    expect(rendered.current().generationError).toBeNull()
    expect(rendered.current().isGenerating).toBe(false)
    await rendered.unmount()
  })

  test('retries only the selected failed image request', async () => {
    const localPatches: Array<Partial<GenerationRecord>> = []
    const failedRecord: GenerationRecord = {
      id: 'stored-generation',
      createdAt: 1,
      mode: 'generate',
      prompt: 'partial success',
      model: config.model,
      group: config.group,
      size: config.parameters.size,
      outputFormat: 'png',
      n: 2,
      images: [
        {
          id: 'stored-image-1',
          src: '/api/image-studio/assets/stored-image-1',
          storageId: 'stored-image-1',
        },
      ],
      imageErrors: ['upstream request failed'],
      failedImageCount: 1,
    }
    storedGeneration = {
      ...storedGeneration,
      images: [
        storedGeneration.images[0],
        {
          id: 'retried-image',
          url: '/api/image-studio/assets/retried-image',
          mime_type: 'image/png',
          size_bytes: 100,
        },
      ],
    }
    const rendered = await renderGenerationHook({
      addRecord: () => undefined,
      patchRecordLocally: (_id, patch) => localPatches.push(patch),
    })

    let retryPromise: Promise<void> | null = null
    await act(async () => {
      retryPromise = rendered.current().retryImage({
        record: failedRecord,
        errorIndex: 0,
      })
      await Promise.resolve()
    })

    expect(pendingRequests).toHaveLength(1)
    expect(rendered.current().retryingImageErrorIndexes).toEqual([0])

    await act(async () => {
      pendingRequests[0].resolve({
        response: { data: [{ url: 'https://example.com/retried.png' }] },
        requestId: 'request-retry',
      })
      await retryPromise
    })

    expect(storeCallCount).toBe(0)
    expect(appendCallCount).toBe(1)
    expect(localPatches.at(-1)?.images?.map((image) => image.id)).toEqual([
      'stored-image-1',
      'retried-image',
    ])
    expect(localPatches.at(-1)?.imageErrors).toEqual([])
    expect(localPatches.at(-1)?.failedImageCount).toBe(0)
    expect(rendered.current().retryingImageErrorIndexes).toEqual([])
    await rendered.unmount()
  })

  test('shows persistence failures in an image error frame', async () => {
    const failedSource = 'https://oss.example.com/failed.png'
    storeError = new Error(
      `Get "${failedSource}": proxyconnect tcp: unsupported image URL host`
    )
    const addedRecords: GenerationRecord[] = []
    const localPatches: Array<Partial<GenerationRecord>> = []
    const rendered = await renderGenerationHook({
      addRecord: (record) => addedRecords.push(record),
      patchRecordLocally: (_id, patch) => localPatches.push(patch),
    })

    let generationPromise: Promise<GenerationRecord | null> | null = null
    await act(async () => {
      generationPromise = rendered.current().generate({
        config,
        prompt: 'persistence failure',
        mode: 'generate',
        referenceImages: [],
      })
      await Promise.resolve()
    })

    await act(async () => {
      pendingRequests[0].resolve({
        response: { data: [{ url: failedSource }] },
        requestId: 'request-failed-source',
      })
      pendingRequests[1].resolve({
        response: { data: [{ url: 'https://example.com/success.png' }] },
        requestId: 'request-success-source',
      })
      await generationPromise
    })

    expect(rendered.current().generationError).toBeNull()
    expect(rendered.current().imageErrors).toEqual([
      `Get "${failedSource}": proxyconnect tcp: unsupported image URL host`,
    ])
    expect(addedRecords.at(-1)?.images.map((image) => image.src)).toEqual([
      '/api/image-studio/assets/stored-image-1',
    ])
    await rendered.unmount()
  })
})
