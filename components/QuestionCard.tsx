'use client'
import { useMemo } from 'react'
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

  return (
    <div>
      <p className="text-xs font-spartan font-600 tracking-widest text-mc-azul uppercase mb-3">
        {String(numero).padStart(2, '0')}
      </p>
      <h2 className="text-2xl sm:text-3xl font-spartan font-700 text-white leading-tight mb-8">
        {texto}
      </h2>
      <div className="flex flex-col gap-3">
        {shuffled.map((op) => {
          const sel = seleccionada === op.valor
          return (
            <button
              key={op.valor}
              onClick={() => onSelect(op.valor)}
              className={`
                w-full text-left px-5 py-4 rounded-sm border font-spartan font-400 text-base
                transition-all duration-150
                ${sel
                  ? 'bg-mc-azul border-mc-azul text-white'
                  : 'bg-transparent border-gray-600 text-gray-200 hover:border-mc-azul hover:bg-mc-azul/10'
                }
              `}
            >
              {op.texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}
