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
import type { PricingData } from '../types'

const AES_GCM_NONCE_SIZE = 12
const AES_KEY_MATERIAL_MIN_BYTES = 32
const MODEL_SQUARE_AES_AAD = 'new-api:model-square:v1'

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(value.trim())
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPricingData(value: unknown): value is PricingData {
  if (!isRecord(value)) return false
  return (
    typeof value.success === 'boolean' &&
    Array.isArray(value.data) &&
    Array.isArray(value.vendors) &&
    isRecord(value.group_ratio) &&
    isRecord(value.usable_group) &&
    isRecord(value.supported_endpoint) &&
    Array.isArray(value.auto_groups)
  )
}

export async function decryptPricingPayload(
  encryptedPayload: string,
  keyMaterial: string
): Promise<PricingData> {
  if (!keyMaterial) {
    throw new Error('MODEL_SQUARE_AES_KEY is not configured in the web build')
  }
  const encoder = new TextEncoder()
  if (encoder.encode(keyMaterial).length < AES_KEY_MATERIAL_MIN_BYTES) {
    throw new Error('MODEL_SQUARE_AES_KEY must contain at least 32 bytes')
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable')
  }

  const payload = decodeBase64(encryptedPayload)
  if (payload.length <= AES_GCM_NONCE_SIZE) {
    throw new Error('Encrypted model square response is invalid')
  }

  const keyBytes = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(keyMaterial)
  )
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['decrypt']
  )
  const decrypted = await globalThis.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: payload.slice(0, AES_GCM_NONCE_SIZE),
      additionalData: encoder.encode(MODEL_SQUARE_AES_AAD),
    },
    key,
    payload.slice(AES_GCM_NONCE_SIZE)
  )
  const parsed: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(decrypted)
  )
  if (!isPricingData(parsed)) {
    throw new Error('Decrypted model square response has an invalid shape')
  }
  return parsed
}
