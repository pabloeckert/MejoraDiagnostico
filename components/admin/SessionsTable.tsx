'use client'
import { calcularEstado, tiempoTranscurrido, formatFechaCorta } from '@/lib/admin'
import type { SessionRow, EstadoSesion } from '@/lib/admin'

const ESTADO_PILL: Record<EstadoSesion, string> = {
  completado: 'bg-[#1A3D84]/10 text-[#1A3D84]',
  en_curso: 'bg-[#F7CC13]/15 text-[#2B2B2B]',
  retomado: 'bg-[#E1061E]/10 text-[#E1061E]',
  abandonado: 'bg-gray-100 text-[#6B7280]',
}

const ESTADO_LABEL: Record<EstadoSesion, string> = {
  completado: 'Completado',
  en_curso: 'En curso',
  retomado: 'Retomado',
  abandonado: 'Abandonado',
}

interface Props {
  sesiones: SessionRow[]
  selectedIds: Set<string>
  onToggleSelected: (sessionId: string) => void
  onToggleSelectAll: () => void
  todasSeleccionadas: boolean
  onVerDetalle: (sessionId: string) => void
}

export default function SessionsTable({
  sesiones,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  todasSeleccionadas,
  onVerDetalle,
}: Props) {
  const ahora = Date.now()

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-mc-gris uppercase tracking-wide">
            <th className="p-3 w-8">
              <input type="checkbox" checked={todasSeleccionadas} onChange={onToggleSelectAll} />
            </th>
            <th className="p-3">Estado</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Paso</th>
            <th className="p-3">Perfil</th>
            <th className="p-3">WhatsApp</th>
            <th className="p-3">Tiempo</th>
            <th className="p-3">Origen</th>
            <th className="p-3">Dispositivo</th>
            <th className="p-3">Inicio</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {sesiones.length === 0 && (
            <tr>
              <td colSpan={11} className="p-6 text-center text-mc-gris">
                No hay sesiones que coincidan con el filtro.
              </td>
            </tr>
          )}
          {sesiones.map((s) => {
            const estado = calcularEstado(s, ahora)
            return (
              <tr
                key={s.session_id}
                className="border-b border-gray-100 hover:bg-mc-gris-claro cursor-pointer"
                onClick={() => onVerDetalle(s.session_id)}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.session_id)}
                    onChange={() => onToggleSelected(s.session_id)}
                  />
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_PILL[estado]}`}>
                    {ESTADO_LABEL[estado]}
                  </span>
                </td>
                <td className="p-3">{s.nombre || '—'}</td>
                <td className="p-3 text-mc-gris">{s.paso || '—'}</td>
                <td className="p-3">{s.perfil || '—'}</td>
                <td className="p-3">{s.whatsapp || '—'}</td>
                <td className="p-3">{tiempoTranscurrido(s.fecha_inicio, ahora)}</td>
                <td className="p-3 text-mc-gris">{s.origen || '—'}</td>
                <td className="p-3 text-mc-gris">{s.dispositivo || '—'}</td>
                <td className="p-3 text-mc-gris">{formatFechaCorta(s.fecha_inicio)}</td>
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onVerDetalle(s.session_id)
                    }}
                    className="text-mc-azul text-xs font-semibold underline"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
