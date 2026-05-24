'use client'

interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs mb-2 font-spartan">
        <span className="text-mc-azul font-700">Pregunta {current} de {total}</span>
        <span className="text-mc-gris">{pct}%</span>
      </div>
      <div className="h-1.5 bg-mc-gris-claro rounded-full overflow-hidden">
        <div
          className="h-full bg-mc-azul rounded-full transition-all duration-400 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
