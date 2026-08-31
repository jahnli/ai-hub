import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

interface OrbitIconDef {
  name: string
  angle: number
}

const INNER_ICONS: OrbitIconDef[] = [
  { name: 'DeepSeek.Color', angle: 0 },
  { name: 'Moonshot', angle: 60 },
  { name: 'Zhipu.Color', angle: 120 },
  { name: 'XiaomiMiMo', angle: 180 },
  { name: 'Minimax.Color', angle: 240 },
  { name: 'Qwen.Color', angle: 300 },
]

const OUTER_ICONS: OrbitIconDef[] = [
  { name: 'Claude.Color', angle: 0 },
  { name: 'OpenAI', angle: 72 },
  { name: 'Gemini.Color', angle: 144 },
  { name: 'Grok', angle: 216 },
  { name: 'Midjourney', angle: 288 },
]

function OrbitDots(props: { icons: OrbitIconDef[]; radius: number }) {
  return props.icons.map((icon) => {
    const rad = (icon.angle * Math.PI) / 180
    const x = props.radius * Math.cos(rad)
    const y = props.radius * Math.sin(rad)
    return (
      <div
        key={icon.name}
        className='orbit-dot'
        style={{
          top: `calc(50% + ${y}px - 22px)`,
          left: `calc(50% + ${x}px - 22px)`,
          animation: 'none',
        }}
      >
        {getLobeIcon(icon.name, 26)}
      </div>
    )
  })
}

interface OrbitAnimationProps {
  className?: string
}

export function OrbitAnimation(props: OrbitAnimationProps) {
  return (
    <div
      className={cn(
        'relative h-[520px] w-[520px] flex items-center justify-center',
        props.className
      )}
    >
      {/* Inner ring — clockwise 20s */}
      <div
        className='orbit-ring orbit-ring-inner'
        style={{
          top: '12%',
          left: '26%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <OrbitDots icons={INNER_ICONS} radius={170} />
      </div>

      {/* Outer ring — counter-clockwise 20s */}
      <div
        className='orbit-ring orbit-ring-outer'
        style={{
          top: 'calc(12% + 60px)',
          left: '36%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <OrbitDots icons={OUTER_ICONS} radius={200} />
      </div>
    </div>
  )
}
