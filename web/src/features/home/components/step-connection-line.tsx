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
import { useEffect, useRef, useState } from 'react'

interface StepConnectionLineProps {
  index: number
}

const CONTAINER_STYLE: React.CSSProperties = {
  ['--step-line-light' as string]: 'var(--primary)',
  ['--step-line-mid' as string]: 'var(--primary)',
  ['--step-line-deep' as string]: 'var(--primary)',
}

export function StepConnectionLine(props: StepConnectionLineProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const updateSize = () => {
      const parent = svg.parentElement
      if (parent) {
        setDimensions({
          width: parent.offsetWidth,
          height: parent.offsetHeight,
        })
      }
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(svg.parentElement!)
    return () => ro.disconnect()
  }, [])

  const { width, height } = dimensions
  if (width === 0) {
    return (
      <svg
        ref={svgRef}
        className='absolute inset-0 size-full'
        style={CONTAINER_STYLE}
        aria-hidden='true'
      />
    )
  }

  const midY = height / 2
  const lineGradId = `line-grad-${props.index}`
  const glowId = `glow-${props.index}`
  const particleGradId = `pgr-${props.index}`
  const baseDelay = props.index * 0.4

  const pathD = `M 0 ${midY} C ${width * 0.35} ${midY - 12}, ${width * 0.65} ${midY + 12}, ${width} ${midY}`

  return (
    <svg
      ref={svgRef}
      className='absolute inset-0 size-full'
      style={CONTAINER_STYLE}
      viewBox={`0 0 ${width} ${height}`}
      fill='none'
      aria-hidden='true'
    >
      <defs>
        <linearGradient id={lineGradId} x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='var(--step-line-light)' stopOpacity='0.6' />
          <stop offset='50%' stopColor='var(--step-line-mid)' stopOpacity='0.9' />
          <stop offset='100%' stopColor='var(--step-line-deep)' stopOpacity='0.6' />
        </linearGradient>

        <filter id={glowId} x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceGraphic' stdDeviation='3' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>

        <radialGradient id={particleGradId}>
          <stop offset='0%' stopColor='var(--step-line-mid)' stopOpacity='1' />
          <stop offset='50%' stopColor='var(--step-line-light)' stopOpacity='0.6' />
          <stop offset='100%' stopColor='var(--step-line-deep)' stopOpacity='0' />
        </radialGradient>
      </defs>

      {/* 静态底线 */}
      <path
        d={pathD}
        stroke={`url(#${lineGradId})`}
        strokeOpacity='0.12'
        strokeWidth='1.5'
        strokeDasharray='6 4'
      />

      {/* 渐变色流动线 */}
      <path
        d={pathD}
        stroke={`url(#${lineGradId})`}
        strokeWidth='2'
        strokeDasharray='16 6'
        strokeLinecap='round'
      >
        <animate
          attributeName='stroke-dashoffset'
          from='44'
          to='0'
          dur='1.8s'
          repeatCount='indefinite'
          begin={`${baseDelay}s`}
        />
      </path>

      {/* 主粒子 */}
      <circle r='3.5' fill={`url(#${particleGradId})`} filter={`url(#${glowId})`}>
        <animateMotion
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay}s`}
          path={pathD}
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='spline'
          keySplines='0.4 0 0.2 1'
        />
        <animate
          attributeName='opacity'
          values='0;1;1;0'
          keyTimes='0;0.08;0.88;1'
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay}s`}
        />
      </circle>

      {/* 尾随粒子 */}
      <circle r='2' fill='var(--step-line-light)' filter={`url(#${glowId})`}>
        <animateMotion
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay + 0.35}s`}
          path={pathD}
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='spline'
          keySplines='0.4 0 0.2 1'
        />
        <animate
          attributeName='opacity'
          values='0;0.55;0.55;0'
          keyTimes='0;0.12;0.82;1'
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay + 0.35}s`}
        />
      </circle>

      {/* 微粒拖尾 */}
      <circle r='1.2' fill='var(--step-line-deep)'>
        <animateMotion
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay + 0.65}s`}
          path={pathD}
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='spline'
          keySplines='0.4 0 0.2 1'
        />
        <animate
          attributeName='opacity'
          values='0;0.35;0.35;0'
          keyTimes='0;0.15;0.78;1'
          dur='2.2s'
          repeatCount='indefinite'
          begin={`${baseDelay + 0.65}s`}
        />
      </circle>
    </svg>
  )
}
