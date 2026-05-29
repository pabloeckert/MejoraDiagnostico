'use client'

interface Props {
  current: number
  total: number
  areaNombre?: string
  nombre?: string
}

export default function ProgressBar({ current, total, areaNombre, nombre }: Props) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-8">
      {nombre && (
        <p className="text-base font-semibold text-mc-negro mb-1">
          Hola, {nombre}
        </p>
      )}
      {areaNombre && (
        <span className="text-xs font-bold tracking-widest uppercase text-mc-azul mb-1 block">
          {areaNombre}
        </span>
      )}
      <p className="text-xs font-bold text-mc-gris tracking-widest uppercase mb-2">
        Pregunta {current} de {total}
      </p>
      <div className="bg-mc-gris-claro rounded-full overflow-hidden" style={{ height: '5px' }}>
        <div
          className="h-full bg-mc-azul rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
