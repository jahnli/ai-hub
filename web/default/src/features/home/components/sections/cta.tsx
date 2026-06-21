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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-0 pb-8 md:pb-12'>
      {!props.isAuthenticated && (
        <>
          {/* Gradient mesh background */}
          <div
            aria-hidden
            className='absolute inset-0 -z-10 opacity-20 dark:opacity-[0.08]'
            style={{
              background: [
                'radial-gradient(ellipse 50% 50% at 30% 50%, oklch(0.7 0.15 250 / 70%) 0%, transparent 70%)',
                'radial-gradient(ellipse 40% 40% at 70% 40%, oklch(0.65 0.12 200 / 50%) 0%, transparent 70%)',
              ].join(', '),
            }}
          />

          <AnimateInView
            className='mx-auto max-w-2xl text-center'
            animation='scale-in'
          >
            <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
              {t('Ready to simplify')}
              <br />
              <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
                {t('your AI integration?')}
              </span>
            </h2>
            <p className='text-muted-foreground/80 mx-auto mt-5 max-w-md text-sm leading-relaxed md:text-base'>
              {t(
                'Deploy your own gateway and start routing requests through your configured upstream services.'
              )}
            </p>
            <div className='mt-8 flex items-center justify-center gap-3'>
              <Button
                className='group rounded-lg'
                render={<Link to='/sign-up' />}
              >
                {t('Get Started')}
                <ArrowRight className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
              <Button
                variant='outline'
                className='border-border/50 hover:border-border hover:bg-muted/50 rounded-lg'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            </div>
          </AnimateInView>
        </>
      )}

      {/* Contact card */}
      <AnimateInView
        className={`mx-auto flex justify-center ${!props.isAuthenticated ? 'mt-6' : ''}`}
        animation='fade-up'
        delay={200}
      >
        <a
          href='https://www.feishu.cn'
          target='_blank'
          rel='noopener noreferrer'
          className='border-border/40 bg-muted/20 hover:border-border/60 hover:bg-muted/40 group flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-xs transition-all duration-300'
        >
          <img
            src='https://p1-hera.feishucdn.com/tos-cn-i-jbbdkfciu3/1ec7129d900e442d8501d810efdaa369~tplv-jbbdkfciu3-image:0:0.image'
            alt='Feishu'
            className='size-8 shrink-0 object-contain'
          />
          <div className='flex flex-col gap-0.5'>
            <span className='text-foreground/80 text-sm font-medium'>
              {t('AI Engineering Efficiency')}・{t('Li Jiaheng')}
            </span>
            <span className='text-muted-foreground/50 text-xs'>
              {t('Having issues? Chat on Feishu')}
            </span>
          </div>
          <ArrowRight className='text-muted-foreground/30 group-hover:text-muted-foreground/60 ml-2 size-4 shrink-0 transition-all duration-300 group-hover:translate-x-0.5' />
        </a>
      </AnimateInView>
    </section>
  )
}
