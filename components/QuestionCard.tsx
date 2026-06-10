'use client'
import { useMemo, useState, useEffect } from 'react'
import type { Opcion } from '@/lib/preguntas'

interface Props {
  texto: string
  numero: number
  contexto?: string
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

export default function QuestionCard({ texto, numero, contexto, opciones, seleccionada, onSelect }: Props) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffled = useMemo(() => shuffle(opciones), [numero])
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
    setTimeout(() => setJustSelected(null), 200)
    onSelect(valor)
  }

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-mc-negro leading-tight mb-2">
        {texto}
      </h2>
      {contexto && (
        <p className="text-xs text-gray-300 mt-1 mb-6">{contexto}</p>
      )}
      <div className="flex flex-col gap-3" role="radiogroup">
        {shuffled.map((op) => {
          const sel = seleccionada === op.valor
          return (
            <button
              key={op.valor}
              role="radio"
              aria-checked={sel}
              onClick={() => handleClick(op.valor)}
              className={`w-full text-left px-5 py-4 min-h-[56px] text-base sm:text-lg rounded-md border-[1.5px] transition-all duration-150 active:scale-[0.98] active:bg-blue-50 ${
                sel
                  ? 'bg-mc-azul border-mc-azul text-white font-semibold'
                  : 'bg-white border-gray-200 text-mc-negro cursor-pointer'
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
