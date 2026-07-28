'use client'
import { useState } from 'react'
import type { EventoRow, SessionRow } from '@/lib/admin'
import { PERFILES, type PerfilKey } from '@/lib/perfiles'
import { calcularScoresDeSesion, generarPDFSesion } from '@/lib/admin-pdf'

interface Props {
  session: SessionRow
  sessionId: string
  eventos: EventoRow[]
  onClose: () => void
}

export default function SessionDetailModal({ session, sessionId, eventos, onClose }: Props) {
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const ordenados = [...eventos].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))

  const perfilValido = session.perfil && session.perfil in PERFILES ? (session.perfil as PerfilKey) : null
  const puedeGenerarPDF = Boolean(perfilValido && calcularScoresDeSesion(session))

  const handleDescargarPDF = async () => {
    if (!perfilValido) return
    setGenerandoPDF(true)
    try {
      await generarPDFSesion(session, perfilValido)
    } catch (e) {
      console.error('Error generando PDF:', e)
    } finally {
      setGenerandoPDF(false)
    }
  }

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

        <div className="mb-4">
          <button
            onClick={handleDescargarPDF}
            disabled={!puedeGenerarPDF || generandoPDF}
            className="text-sm font-bold px-4 py-2 rounded bg-mc-azul text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generandoPDF ? 'Generando…' : '📄 Descargar PDF para el cliente'}
          </button>
          {!puedeGenerarPDF && (
            <p className="text-xs text-mc-gris mt-1">
              Esta sesión todavía no tiene un perfil calculado (abandonada o en curso).
            </p>
          )}
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
