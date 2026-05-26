'use client'

interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-8">
      <p className="text-xs font-bold text-mc-azul tracking-widest uppercase mb-2">
        Pregunta {current} de {total}
      </p>
      <div className="bg-mc-gris-claro rounded-full overflow-hidden" style={{ height: '3px' }}>
        <div
          className="h-full bg-mc-azul rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
