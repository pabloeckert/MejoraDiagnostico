'use client'
import { useEffect, useState } from 'react'
import { zonaColor } from '@/lib/areas'

interface Props {
  nombre: string
  porcentaje: number
  delay: number
  start?: boolean
}

export default function AreaBar({ nombre, porcentaje, delay, start = true }: Props) {
  const [width, setWidth] = useState(0)
  const { color, zona } = zonaColor(porcentaje)
  const [barColor, setBarColor] = useState(color)

  const porcentajeMostrado = Math.min(98, Math.round(porcentaje))

  useEffect(() => {
    if (!start) return
    const t = setTimeout(() => {
      setWidth(porcentajeMostrado)
      setBarColor(color)
    }, delay)
    return () => clearTimeout(t)
  }, [porcentajeMostrado, delay, color, start])

  return (
    <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: color + '14' }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-base font-bold text-mc-negro">{nombre}</span>
        <span
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: color, color: zona === 'En desarrollo' ? '#2B2B2B' : 'white' }}
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
