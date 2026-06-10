'use client'
import { useEffect, useRef, useState } from 'react'
import { zonaColor } from '@/lib/areas'

interface Props {
  value: number
  nombre: string
  delay?: number
}

const R = 40
const SW = 8
const CX = 50
const CY = 55
const TOTAL_LEN = Math.PI * R

export default function GaugeArea({ value, nombre, delay = 0 }: Props) {
  const { color, zona } = zonaColor(value)
  const [animated, setAnimated] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true)
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
    <div className="flex flex-col items-center w-24">
      <svg
        ref={svgRef}
        viewBox="0 0 100 60"
        width={96}
        height={58}
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
          style={{
            transition: animated
              ? `stroke-dashoffset 1.2s ease-out ${delay}ms`
              : 'none'
          }}
        />
        {/* Zona label */}
        <text
          x={CX}
          y={CY - 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fontWeight="700"
          fill={color}
        >
          {zona.toUpperCase()}
        </text>
        {/* Porcentaje */}
        <text
          x={CX}
          y={CY - 7}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="700"
          fill={color}
        >
          {value}%
        </text>
      </svg>
      <p className="text-xs text-center text-gray-400 leading-tight mt-1 px-1">
        {nombre}
      </p>
    </div>
  )
}
