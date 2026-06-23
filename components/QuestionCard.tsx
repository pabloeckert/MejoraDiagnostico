'use client'
import { useMemo, useState, useEffect } from 'react'
import type { Opcion } from '@/lib/preguntas'

interface Props {
  texto: string
  numero: number
  preguntaIndex: number
  contexto?: string
  opciones: Opcion[]
  seleccionada: number | null
  onSelect: (valor: number) => void
}

export default function QuestionCard({ texto, numero, preguntaIndex, contexto, opciones, seleccionada, onSelect }: Props) {
  const shuffled = useMemo(() => {
    const a = [...opciones]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaIndex])
  const [justSelected, setJustSelected] = useState<number | null>(null)

  useEffect(() => {
    setJustSelected(null)
  }, [opciones])

  function handleClick(valor: number) {
    if (
      typeof window !== 'undefined' &&
      'vibrate' in navigator &&
      /android/i.test(navigator.userAgent)
    ) {
      navigator.vibrate(8)
    }
    setJustSelected(valor)
    setTimeout(() => setJustSelected(null), 250)
    onSelect(valor)
  }

  return (
    <div>
      <h2 className="text-3xl sm:text-4xl font-bold text-mc-negro leading-tight mb-2">
        {texto}
      </h2>
      {contexto && (
        <p className="text-base text-gray-700 mt-1 mb-6">{contexto}</p>
      )}
      <div
        key={preguntaIndex}
        className="flex flex-col gap-3"
        role="radiogroup"
        style={{ animation: 'fadeUp 0.3s ease forwards' }}
      >
        {shuffled.map((op, i) => {
          const sel = seleccionada === op.valor
          return (
            <button
              key={i}
              role="radio"
              aria-checked={sel}
              onClick={() => handleClick(op.valor)}
              className={`w-full text-left px-5 py-5 min-h-[64px] text-lg sm:text-xl font-medium rounded-md border-[1.5px] transition-all duration-200 ${
                sel
                  ? 'bg-mc-azul border-mc-azul text-white font-semibold'
                  : 'bg-white border-gray-200 text-mc-negro cursor-pointer'
              } ${justSelected === op.valor ? 'animate-option-pop' : ''}`}
            >
              {op.texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}
