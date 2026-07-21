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
import JSZip from 'jszip'

import type { GeneratedImage } from '../types'

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function imageSrcToDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src

  const blob = await srcToBlob(src)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function guessMimeFromDataUrl(src: string): string {
  const match = /^data:([^;,]+)/.exec(src)
  return match?.[1] ?? 'image/png'
}

function extensionForMime(mime: string): string {
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('gif')) return 'gif'
  return 'png'
}

function extensionForOutputFormat(outputFormat: string | undefined): string | null {
  if (outputFormat === 'webp') return 'webp'
  if (outputFormat === 'jpeg' || outputFormat === 'jpg') return 'jpg'
  if (outputFormat === 'png') return 'png'
  return null
}

export function imageFileName(
  index: number,
  src: string,
  outputFormat?: string
): string {
  const ext =
    extensionForOutputFormat(outputFormat) ??
    (src.startsWith('data:') ? extensionForMime(guessMimeFromDataUrl(src)) : 'png')
  return `image-${index + 1}.${ext}`
}

async function srcToBlob(src: string): Promise<Blob> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`failed to fetch image: ${res.status}`)
  return res.blob()
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Download a single image. Remote URLs may reject cross-origin fetch;
 * fall back to opening in a new tab so the user can save manually.
 */
export async function downloadImage(
  src: string,
  fileName: string
): Promise<void> {
  try {
    const blob = await srcToBlob(src)
    triggerBlobDownload(blob, fileName)
  } catch {
    window.open(src, '_blank', 'noopener')
  }
}

/** Bundle all images into a single zip download. Returns skipped count. */
export async function downloadImagesAsZip(
  images: GeneratedImage[],
  zipName: string,
  outputFormat?: string
): Promise<number> {
  const zip = new JSZip()
  let skipped = 0
  await Promise.all(
    images.map(async (image, index) => {
      try {
        const blob = await srcToBlob(image.src)
        zip.file(imageFileName(index, image.src, outputFormat), blob)
      } catch {
        skipped += 1
      }
    })
  )
  if (skipped === images.length) return skipped
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerBlobDownload(blob, `${zipName}.zip`)
  return skipped
}

export async function copyImageToClipboard(src: string): Promise<void> {
  const blob = await srcToBlob(src)
  // PNG is the only broadly supported clipboard image type
  const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob)
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': pngBlob }),
  ])
}

async function convertToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2d context unavailable')
  context.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error('canvas toBlob failed')),
      'image/png'
    )
  })
}
