'use client'
import { useState } from 'react'

const PASOS_TOUR = [
  {
    titulo: 'Bienvenida al Centro de Mando',
    texto:
      'Acá gestionás en tiempo real quién entra al diagnóstico, quién completó su radiografía 4D y los plazos de contacto (SLA 48h). Te lo muestro en 4 pasos.',
  },
  {
    titulo: 'Tablero Kanban (SLA 48h)',
    texto:
      'En la primera columna ves visitantes en vivo. Arrastrá cada prospecto entre Completado, En Contacto, Reunión, Propuesta y Cerrado, copiá su Brief WhatsApp en 1 clic o registrá notas de seguimiento.',
  },
  {
    titulo: 'Pestaña General y Detalle',
    texto:
      'En General ves embudo y distribución de arquetipos. En Detalle podés filtrar por estado, ver el recorrido minuto a minuto de cada persona y descargar su reporte PDF.',
  },
  {
    titulo: 'Pestaña Exportación',
    texto:
      'Elegís sesiones puntuales o todo el listado filtrado y descargás una planilla Excel lista para análisis comercial.',
  },
  {
    titulo: 'Listo para operar',
    texto:
      'Podés volver a abrir esta guía con el botón (?) en cualquier momento. Si querés probar arrastres y flujos sin afectar leads reales, usá el Laboratorio (🧪 Lab).',
  },
]

export default function TourGuiado({ onCerrar }: { onCerrar: () => void }) {
  const [paso, setPaso] = useState(0)
  const esUltimo = paso === PASOS_TOUR.length - 1
  const actual = PASOS_TOUR[paso]

  const cerrarYMarcarVisto = () => {
    localStorage.setItem('mc_admin_tour_visto', 'true')
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-mc-negro mb-3">{actual.titulo}</h2>
          <p className="text-base text-gray-700 mb-6">{actual.texto}</p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={cerrarYMarcarVisto}
              className="min-h-[44px] px-2 text-sm text-mc-gris underline cursor-pointer"
            >
              Saltar
            </button>

            <div className="flex items-center gap-2">
              {paso > 0 && (
                <button
                  onClick={() => setPaso((p) => p - 1)}
                  className="min-h-[44px] text-sm font-semibold px-4 py-2 rounded bg-mc-gris-claro text-mc-tinta cursor-pointer"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={() => (esUltimo ? cerrarYMarcarVisto() : setPaso((p) => p + 1))}
                className="min-h-[44px] text-sm font-bold px-4 py-2 rounded bg-mc-azul hover:bg-mc-azul-marino text-white cursor-pointer"
              >
                {esUltimo ? 'Entendido' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{
            background:
              'linear-gradient(90deg, #1A3D84 0%, #1A3D84 60%, #E1061E 60%, #E1061E 80%, #F7CC13 80%, #F7CC13 100%)',
          }}
        />
      </div>
    </div>
  )
}
