import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ImagePreviewDialog } from '@/components/image-preview-dialog/image-preview-dialog'
import {
  copyImageToClipboard,
  downloadImage,
  imageFileName,
} from '@/features/image-studio/lib/image-utils'

import type { ImageAuditPreviewTarget } from '../types'

interface ImageAuditPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ImageAuditPreviewTarget | null
}

export function ImageAuditPreviewDialog(props: ImageAuditPreviewDialogProps) {
  const { t } = useTranslation()

  if (!props.target || !props.target.item.images?.length) return null

  const item = props.target.item
  const previewImages = item.images.map((image, index) => ({
    id: `${item.id}-${index}`,
    src: image.url,
    alt: (image.revised_prompt || item.prompt).slice(0, 80),
    description: image.revised_prompt || item.prompt,
    onCopy: async () => {
      try {
        await copyImageToClipboard(image.url)
        toast.success(t('Image copied to clipboard'))
      } catch {
        toast.error(t('Copy failed, please download instead'))
      }
    },
    onDownload: () =>
      downloadImage(
        image.url,
        imageFileName(index, image.url, item.output_format)
      ),
  }))

  return (
    <ImagePreviewDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      images={previewImages}
      initialIndex={props.target.index}
    />
  )
}
