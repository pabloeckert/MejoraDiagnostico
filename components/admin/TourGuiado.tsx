'use client'
import { useState } from 'react'

const PASOS_TOUR = [
  {
    titulo: 'Bienvenida al Monitor',
    texto: 'Acá vas a poder ver en tiempo real quién entra al diagnóstico, en qué paso está cada uno, y quién ya completó. Te lo muestro en 4 pasos rápidos.',
  },
  {
    titulo: 'Pestaña General',
    texto: 'Acá arriba tenés el resumen: cuántas visitas hubo, cuántos completaron, y dos gráficos — uno muestra en qué paso se cae la gente (el embudo), el otro qué perfil sale más seguido.',
  },
  {
    titulo: 'Pestaña Detalle',
    texto: "Acá ves cada sesión individual: el nombre, en qué paso está ahora, si completó o abandonó, y hace cuánto. Podés buscar por nombre o WhatsApp, y filtrar por estado. Tocá 'Ver detalle' en cualquier fila para ver el recorrido completo de esa persona, minuto a minuto.",
  },
  {
    titulo: 'Pestaña Exportación',
    texto: 'Elegís qué sesiones (marcándolas con el check en Detalle) y qué datos querés, y descargás un Excel. Si no marcás ninguna, exporta todo lo que estás viendo filtrado.',
  },
  {
    titulo: 'Listo',
    texto: "Eso es todo. Podés volver a ver este recorrido tocando el botón de ayuda (?) arriba en cualquier momento. Dale, explorá con el botón 'Ver datos de ejemplo' para practicar antes de que lleguen visitas reales.",
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
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-mc-negro mb-3">{actual.titulo}</h2>
        <p className="text-base text-gray-700 mb-6">{actual.texto}</p>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={cerrarYMarcarVisto}
            className="text-sm text-mc-gris underline"
          >
            Saltar
          </button>

          <div className="flex items-center gap-2">
            {paso > 0 && (
              <button
                onClick={() => setPaso((p) => p - 1)}
                className="text-sm font-semibold px-4 py-2 rounded bg-mc-gris-claro text-mc-gris"
              >
                Anterior
              </button>
            )}
            <button
              onClick={() => (esUltimo ? cerrarYMarcarVisto() : setPaso((p) => p + 1))}
              className="text-sm font-bold px-4 py-2 rounded bg-mc-azul text-white"
            >
              {esUltimo ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
