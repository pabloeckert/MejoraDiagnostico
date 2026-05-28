'use client'
import { useMemo, useState, useEffect } from 'react'
import type { Opcion } from '@/lib/preguntas'

interface Props {
  texto: string
  numero: number
  opciones: Opcion[]
  seleccionada: number | null
  onSelect: (valor: number) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuestionCard({ texto, numero, opciones, seleccionada, onSelect }: Props) {
  const shuffled = useMemo(() => shuffle(opciones), [opciones])
  const [justSelected, setJustSelected] = useState<number | null>(null)

  useEffect(() => {
    setJustSelected(null)
  }, [opciones])

  function handleClick(valor: number) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8)
    }
    setJustSelected(valor)
    setTimeout(() => setJustSelected(null), 200)
    onSelect(valor)
  }

  return (
    <div>
      <p className="text-xs font-bold text-mc-azul tracking-widest uppercase mb-3">
        {String(numero).padStart(2, '0')}
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold text-mc-negro leading-tight mb-8">
        {texto}
      </h2>
      <div className="flex flex-col gap-3">
        {shuffled.map((op) => {
          const sel = seleccionada === op.valor
          return (
            <button
              key={op.valor}
              onClick={() => handleClick(op.valor)}
              className={`w-full text-left px-5 py-4 text-base sm:text-lg rounded-md border-[1.5px] transition-all duration-150 ${
                sel
                  ? 'bg-mc-azul border-mc-azul text-white font-semibold'
                  : 'bg-white border-gray-200 text-mc-negro hover:border-mc-azul hover:bg-blue-50 cursor-pointer'
              } ${justSelected === op.valor ? 'animate-option-select' : ''}`}
            >
              {op.texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}
