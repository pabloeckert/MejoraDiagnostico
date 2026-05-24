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
      <p className="text-xs font-spartan font-700 tracking-widest text-mc-azul uppercase mb-3">
        {String(numero).padStart(2, '0')}
      </p>
      <h2 className="text-2xl sm:text-3xl font-spartan font-700 text-mc-negro leading-tight mb-8">
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
                w-full text-left px-5 py-4 font-spartan font-400 text-base
                transition-all duration-150
                ${sel
                  ? 'bg-mc-azul text-white font-600'
                  : 'bg-white text-mc-negro hover:bg-[#f0f4ff]'
                }
              `}
              style={{
                borderRadius: '2px',
                border: sel ? '1.5px solid #1C4D8C' : '1.5px solid #e0e0e0',
              }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.borderColor = '#1C4D8C' }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0' }}
            >
              {op.texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}
