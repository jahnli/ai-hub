import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { ImagePreviewDialog } from '../image-preview-dialog'

const images = [
  {
    id: 'first',
    src: 'https://example.com/first.png',
    alt: 'First image',
    description: 'First prompt',
    onCopy: () => undefined,
    onDownload: () => undefined,
  },
  {
    id: 'second',
    src: 'https://example.com/second.png',
    alt: 'Second image',
    description: 'Second prompt',
    onCopy: () => undefined,
    onDownload: () => undefined,
  },
]

describe('ImagePreviewDialog interactions', () => {
  test('navigates with shared toolbar controls and resets the transformed view', () => {
    render(
      <ImagePreviewDialog
        open
        onOpenChange={() => undefined}
        images={images}
        initialIndex={0}
      />
    )
    const previewImage = screen.getByRole('img', { name: 'First image' })

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rotate' }))
    expect(previewImage).toHaveStyle({
      transform: 'scale(1.25) rotate(90deg)',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    const nextImage = screen.getByRole('img', { name: 'Second image' })
    expect(nextImage).toHaveStyle({ transform: 'scale(1) rotate(0deg)' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('Second prompt')).toBeInTheDocument()
  })

  test('wraps keyboard navigation and exposes edit only when provided', () => {
    const onEdit = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ImagePreviewDialog
        open
        onOpenChange={onOpenChange}
        images={[
          images[0],
          {
            ...images[1],
            onEdit,
          },
        ]}
        initialIndex={0}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(
      screen.queryByRole('button', { name: 'Edit this image' })
    ).not.toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(
      screen.getByRole('img', { name: 'Second image' })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit this image' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
