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
  const { color } = zonaColor(porcentaje)

  useEffect(() => {
    const t = setTimeout(() => setWidth(porcentaje), delay)
    return () => clearTimeout(t)
  }, [porcentaje, delay])

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-semibold text-mc-negro">{nombre}</span>
        <span className="text-xs font-bold" style={{ color }}>{porcentaje}%</span>
      </div>
      <div className="h-1.5 bg-mc-gris-claro rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
