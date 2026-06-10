'use client'
import { useEffect, useRef, useState } from 'react'
import { zonaColor } from '@/lib/areas'

interface Props {
  value: number
  delayMs?: number
}

const CX = 50, CY = 50, R = 36, SW = 8
const TOTAL_LEN = Math.PI * R
const ANIM_MS = 1200

export default function GaugeArea({ value, delayMs = 0 }: Props) {
  const { color, zona } = zonaColor(value)
  const [triggered, setTriggered] = useState(false)
  const [labelVisible, setLabelVisible] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered) return
    const tid = setTimeout(() => setLabelVisible(true), delayMs + ANIM_MS + 100)
    return () => clearTimeout(tid)
  }, [triggered, delayMs])

  const dashOffset = triggered
    ? TOTAL_LEN - (value / 100) * TOTAL_LEN
    : TOTAL_LEN

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 65"
      width={90}
      height={58}
    >
      {/* Track gris */}
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke="#e0e0e0"
        strokeWidth={SW}
        strokeLinecap="round"
      />
      {/* Arco de progreso */}
      <path
        d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray={`${TOTAL_LEN} ${TOTAL_LEN}`}
        strokeDashoffset={dashOffset}
        style={{
          transition: triggered
            ? `stroke-dashoffset ${ANIM_MS}ms ease-out ${delayMs}ms`
            : 'none',
        }}
      />
      {/* Zona label */}
      <text
        x={CX} y={CY - 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        fontWeight="700"
        fill={color}
        style={{ opacity: labelVisible ? 1 : 0, transition: 'opacity 300ms ease' }}
      >
        {zona.toUpperCase()}
      </text>
      {/* Porcentaje */}
      <text
        x={CX} y={CY - 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="700"
        fill={color}
      >
        {value}%
      </text>
    </svg>
  )
}
