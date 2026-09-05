import { AnimateInView } from '@/components/animate-in-view'
import { FeishuSupportLink } from '@/components/feishu-support-link'
import { useStatus } from '@/hooks/use-status'

export function CTA() {
  const { status } = useStatus()
  const feishuSupportOpenId = (status?.feishu_support_open_id ??
    status?.data?.feishu_support_open_id) as string | undefined

  if (!feishuSupportOpenId?.trim()) return null

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-0 pb-8 md:pb-12'>
      <AnimateInView
        className='mx-auto flex justify-center'
        animation='fade-up'
        delay={200}
      >
        <FeishuSupportLink openId={feishuSupportOpenId} />
      </AnimateInView>
    </section>
  )
}
