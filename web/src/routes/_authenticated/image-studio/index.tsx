import { createFileRoute, redirect } from '@tanstack/react-router'

import { Main } from '@/components/layout'
import { ImageStudio } from '@/features/image-studio'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

export const Route = createFileRoute('/_authenticated/image-studio/')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'image_studio')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ImageStudioPage,
})

function ImageStudioPage() {
  return (
    <Main className='p-0'>
      <ImageStudio />
    </Main>
  )
}
