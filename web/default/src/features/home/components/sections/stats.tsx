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
import { useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, DollarSign, Code, Gauge } from 'lucide-react'
import { HeroTerminalDemo } from '../hero-terminal-demo'

interface CounterProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
}

function Counter(props: CounterProps) {
  const { end, suffix = '', prefix = '', duration = 1600, decimals = 0 } = props
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  const formatValue = useCallback(
    (v: number) =>
      decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
    [decimals]
  )

  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${prefix}${formatValue(eased * end)}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, prefix, suffix, formatValue])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = `${prefix}${formatValue(end)}${suffix}`
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate, end, prefix, suffix, formatValue])

  return (
    <span ref={ref} className='tabular-nums'>
      {prefix}0{suffix}
    </span>
  )
}

interface StatsProps {
  className?: string
}

interface StatItem {
  end: number
  suffix: string
  label: string
  decimals?: number
  icon: ReactNode
  iconBg: string
}

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  const stats: StatItem[] = [
    {
      end: 50,
      suffix: '+',
      label: t('upstream services integrated'),
      icon: <Layers className='size-4 text-blue-400' strokeWidth={1.5} />,
      iconBg: 'bg-blue-500/10',
    },
    {
      end: 100,
      suffix: '+',
      label: t('model billing support'),
      icon: <DollarSign className='size-4 text-emerald-400' strokeWidth={1.5} />,
      iconBg: 'bg-emerald-500/10',
    },
    {
      end: 50,
      suffix: '+',
      label: t('compatible API routes'),
      icon: <Code className='size-4 text-amber-400' strokeWidth={1.5} />,
      iconBg: 'bg-amber-500/10',
    },
    {
      end: 10,
      suffix: '+',
      label: t('scheduling controls'),
      icon: <Gauge className='size-4 text-violet-400' strokeWidth={1.5} />,
      iconBg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className='border-border/40 bg-muted/10 relative z-10 border-y'>
      <div className='mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 py-10 md:py-12 lg:grid-cols-2 lg:gap-12 lg:px-0'>
        {/* Left: stat counters in 2×2 grid */}
        <div className='grid grid-cols-2 gap-4'>
          {stats.map((s) => (
            <div
              key={s.label}
              className='glass-3 flex flex-col items-start gap-3 rounded-xl p-5'
            >
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${s.iconBg}`}
              >
                {s.icon}
              </div>
              <span className='stat-shimmer text-3xl font-bold tracking-tight md:text-4xl'>
                <Counter end={s.end} suffix={s.suffix} decimals={s.decimals} />
              </span>
              <span className='text-muted-foreground text-xs'>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Right: terminal demo */}
        <HeroTerminalDemo className='mx-auto w-full max-w-xl' />
      </div>
    </div>
  )
}
