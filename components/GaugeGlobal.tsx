'use client'
import { useEffect, useRef, useState } from 'react'
import { zonaColor } from '@/lib/areas'

interface Props {
  value: number
}

const R = 80
const SW = 12
const CX = 100
const CY = 100
const TOTAL_LEN = Math.PI * R

export default function GaugeGlobal({ value }: Props) {
  const { color } = zonaColor(value)
  const [animated, setAnimated] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true)
          setTimeout(() => {
            setPulsing(true)
            setTimeout(() => setPulsing(false), 200)
          }, 1200)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const dashOffset = animated ? TOTAL_LEN - (value / 100) * TOTAL_LEN : TOTAL_LEN

  return (
    <div className="flex flex-col items-center my-8">
      <div style={{ transform: pulsing ? 'scale(1.03)' : 'scale(1)', transition: 'transform 200ms ease' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 200 110"
          width={200}
          height={110}
        >
          {/* Track */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={SW}
            strokeLinecap="round"
          />
          {/* Fill animado */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${TOTAL_LEN} ${TOTAL_LEN}`}
            strokeDashoffset={dashOffset}
            style={{ transition: animated ? 'stroke-dashoffset 1.2s ease-out' : 'none' }}
          />
          {/* Porcentaje */}
          <text
            x={CX}
            y={CY - 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="30"
            fontWeight="700"
            fill={color}
          >
            {value}%
          </text>
          {/* Label */}
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#9CA3AF"
          >
            puntaje global
          </text>
        </svg>
      </div>
    </div>
  )
}
