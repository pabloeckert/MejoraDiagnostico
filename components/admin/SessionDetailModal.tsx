'use client'
import type { EventoRow } from '@/lib/admin'

interface Props {
  sessionId: string
  eventos: EventoRow[]
  onClose: () => void
}

export default function SessionDetailModal({ sessionId, eventos, onClose }: Props) {
  const ordenados = [...eventos].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-mc-negro">Línea de tiempo de la sesión</h3>
            <p className="text-xs text-mc-gris break-all">{sessionId}</p>
          </div>
          <button onClick={onClose} className="text-mc-gris text-xl leading-none">×</button>
        </div>

        {ordenados.length === 0 ? (
          <p className="text-sm text-mc-gris">No hay eventos registrados para esta sesión.</p>
        ) : (
          <ol className="relative border-l border-gray-200 pl-4 space-y-4">
            {ordenados.map((e, i) => (
              <li key={i}>
                <p className="text-xs text-mc-gris">
                  {isNaN(Date.parse(e.timestamp)) ? e.timestamp : new Date(e.timestamp).toLocaleString('es-AR')}
                </p>
                <p className="text-sm font-semibold text-mc-azul-marino">{e.evento}</p>
                {e.detalle && <p className="text-sm text-mc-tinta">{e.detalle}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
