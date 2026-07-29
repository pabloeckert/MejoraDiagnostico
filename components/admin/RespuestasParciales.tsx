'use client'
import { PREGUNTAS } from '@/lib/preguntas'
import { parsearRespuestasDeEventos } from '@/lib/admin'
import type { EventoRow, SessionRow } from '@/lib/admin'

interface Props {
  session: SessionRow
  eventos: EventoRow[]
}

function estadoNoIniciado(paso: string): string | null {
  if (paso === 'inicio') return 'Todavía no había ingresado su nombre — abandonó en la landing.'
  if (paso === 'preguntas') return 'Ingresó su nombre pero abandonó antes de responder la primera pregunta.'
  return null
}

export default function RespuestasParciales({ session, eventos }: Props) {
  const respondidas = parsearRespuestasDeEventos(eventos)
  const ultimaRespondida = respondidas.size ? Math.max(...Array.from(respondidas.keys())) : 0
  const mensajeVacio = estadoNoIniciado(session.paso)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <p className="text-lg font-bold text-mc-negro">{session.nombre || 'Sin nombre'}</p>
          {session.whatsapp && <p className="text-sm text-mc-gris">{session.whatsapp}</p>}
        </div>
        <p className="text-xs text-mc-gris uppercase tracking-widest text-right shrink-0">
          {respondidas.size} de {PREGUNTAS.length} preguntas respondidas
        </p>
      </div>

      {mensajeVacio ? (
        <p className="text-sm text-mc-gris">{mensajeVacio}</p>
      ) : (
        <div className="space-y-5">
          {PREGUNTAS.map((p, i) => {
            const numero = i + 1
            const valor = respondidas.get(numero)
            const respondida = valor !== undefined
            const esPuntoDeAbandono = !respondida && numero === ultimaRespondida + 1

            if (!respondida && !esPuntoDeAbandono) {
              return (
                <p key={i} className="text-sm text-mc-gris opacity-40">
                  {numero}. {p.texto}
                </p>
              )
            }

            return (
              <div key={i}>
                <p className="text-sm font-semibold text-mc-negro mb-1">{numero}. {p.texto}</p>
                <p className="text-xs text-mc-gris mb-3">{p.contexto}</p>
                <div className="flex flex-col gap-2">
                  {p.opciones.map((op) => (
                    <div
                      key={op.valor}
                      className={`px-4 py-3 rounded-md border text-sm ${
                        valor === op.valor
                          ? 'bg-mc-azul border-mc-azul text-white font-semibold'
                          : 'bg-white border-gray-200 text-mc-gris'
                      }`}
                    >
                      {op.texto}
                    </div>
                  ))}
                </div>
                {esPuntoDeAbandono && (
                  <p className="mt-3 text-sm font-bold text-mc-rojo">
                    👋 Abandonó acá — no llegó a responder esta pregunta
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {respondidas.size === PREGUNTAS.length && (
        <p className="text-sm text-mc-gris italic border-t border-gray-100 pt-4">
          Completó las 8 preguntas pero no llegó a dejar sus datos de contacto (o abandonó antes de ver el resultado).
        </p>
      )}
    </div>
  )
}
