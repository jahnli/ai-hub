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
import { webcrypto } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { PricingData } from '../../types'
import { decryptPricingPayload } from '../pricing-encryption'

const TEST_KEY = 'test-only-model-square-key-32-bytes'
const TEST_AAD = 'new-api:model-square:v1'

const pricingFixture: PricingData = {
  success: true,
  data: [
    {
      id: 1,
      model_name: 'test-model',
      quota_type: 0,
      model_ratio: 1,
      completion_ratio: 1,
      enable_groups: ['default'],
    },
  ],
  vendors: [],
  group_ratio: { default: 1 },
  usable_group: { default: { desc: 'Default', ratio: 1 } },
  supported_endpoint: {},
  auto_groups: [],
}

async function encryptPricingFixture(
  value: unknown,
  keyMaterial: string
): Promise<string> {
  const encoder = new TextEncoder()
  const keyBytes = await webcrypto.subtle.digest(
    'SHA-256',
    encoder.encode(keyMaterial)
  )
  const key = await webcrypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['encrypt']
  )
  const nonce = Uint8Array.from({ length: 12 }, (_, index) => index)
  const encrypted = new Uint8Array(
    await webcrypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: encoder.encode(TEST_AAD),
      },
      key,
      encoder.encode(JSON.stringify(value))
    )
  )
  const payload = new Uint8Array(nonce.length + encrypted.length)
  payload.set(nonce)
  payload.set(encrypted, nonce.length)
  return Buffer.from(payload).toString('base64')
}

describe('model square pricing response decryption', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('decrypts the AES-GCM response and parses the original JSON', async () => {
    const encrypted = await encryptPricingFixture(pricingFixture, TEST_KEY)

    await expect(decryptPricingPayload(encrypted, TEST_KEY)).resolves.toEqual(
      pricingFixture
    )
  })

  test('rejects ciphertext when the configured key differs', async () => {
    const encrypted = await encryptPricingFixture(pricingFixture, TEST_KEY)

    await expect(
      decryptPricingPayload(encrypted, 'different-model-square-key-32-bytes')
    ).rejects.toThrow()
  })

  test('rejects a configured key shorter than 32 bytes', async () => {
    const encrypted = await encryptPricingFixture(pricingFixture, TEST_KEY)

    await expect(decryptPricingPayload(encrypted, 'short-key')).rejects.toThrow(
      'at least 32 bytes'
    )
  })

  test('rejects decrypted JSON that is not a pricing response', async () => {
    const encrypted = await encryptPricingFixture({ invalid: true }, TEST_KEY)

    await expect(decryptPricingPayload(encrypted, TEST_KEY)).rejects.toThrow(
      'invalid shape'
    )
  })
})
