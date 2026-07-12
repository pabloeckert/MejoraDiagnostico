'use client'
import { useEffect, useState } from 'react'
import { zonaColor } from '@/lib/areas'

interface Props {
  nombre: string
  porcentaje: number
  delay: number
}

export default function AreaBar({ nombre, porcentaje, delay }: Props) {
  const [width, setWidth] = useState(0)
  const { color, zona } = zonaColor(porcentaje)
  const [barColor, setBarColor] = useState(color)

  useEffect(() => {
    const t = setTimeout(() => {
      setWidth(porcentaje)
      setBarColor(color)
    }, delay)
    return () => clearTimeout(t)
  }, [porcentaje, delay, color])

  return (
    <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: color + '14' }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-base font-bold text-mc-negro">{nombre}</span>
        <span
          className="text-sm font-bold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {zona}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: '7px', backgroundColor: 'rgba(255,255,255,0.65)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: barColor,
            transition: 'width 1800ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 1800ms ease-out',
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  )
}
