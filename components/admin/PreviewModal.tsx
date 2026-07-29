'use client'
import type { EventoRow, SessionRow } from '@/lib/admin'
import type { PerfilKey } from '@/lib/perfiles'
import type { Scores } from '@/lib/scoring'
import PDFTemplateResultado from './PDFTemplateResultado'
import RespuestasParciales from './RespuestasParciales'

interface Props {
  session: SessionRow
  eventos: EventoRow[]
  perfil: PerfilKey | null
  scores: Scores | null
  onClose: () => void
  onDescargarPDF: () => void
  generandoPDF: boolean
}

export default function PreviewModal({ session, eventos, perfil, scores, onClose, onDescargarPDF, generandoPDF }: Props) {
  const completo = Boolean(perfil && scores)

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-mc-negro">
            {completo ? 'Vista previa del informe' : 'Vista previa — recorrido del encuestado'}
          </h3>
          <div className="flex items-center gap-3">
            {completo && (
              <button
                onClick={onDescargarPDF}
                disabled={generandoPDF}
                className="text-xs font-bold px-3 py-2 rounded bg-mc-azul text-white disabled:opacity-50"
              >
                {generandoPDF ? 'Generando…' : '📄 Descargar PDF'}
              </button>
            )}
            <button onClick={onClose} className="text-mc-gris text-xl leading-none">×</button>
          </div>
        </div>

        <div className="overflow-y-auto overflow-x-auto">
          {completo && perfil && scores ? (
            <div className="p-4 flex justify-center">
              <PDFTemplateResultado session={session} perfil={perfil} scores={scores} />
            </div>
          ) : (
            <RespuestasParciales session={session} eventos={eventos} />
          )}
        </div>
      </div>
    </div>
  )
}
