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
  const { zona, color } = zonaColor(porcentaje)

  useEffect(() => {
    const t = setTimeout(() => setWidth(porcentaje), delay)
    return () => clearTimeout(t)
  }, [porcentaje, delay])

  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-spartan font-600 text-gray-800">{nombre}</span>
        <span className="text-xs font-spartan font-700" style={{ color }}>
          {porcentaje}% · {zona}
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
