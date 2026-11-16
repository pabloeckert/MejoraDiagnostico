'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import { cargarSession, guardarPregunta0, type Pregunta0Data } from '@/hooks/useDiagnostico'
import { trackFunnel, registrarVisitaTemprana, type TelemetryVisitResult } from '@/lib/funnel'

interface OpcionCero extends Pregunta0Data {
  icono: string
}

const OPCIONES_CERO: OpcionCero[] = [
  {
    id: 'incendios',
    texto: 'Apagar incendios operativos y no tener tiempo para pensar',
    dimension: 'personal',
    icono: '🔥',
  },
  {
    id: 'equipo',
    texto: 'Mi equipo no responde solo y todo termina en mi escritorio',
    dimension: 'organizacional',
    icono: '👥',
  },
  {
    id: 'ventas',
    texto: 'Las ventas y los ingresos no reflejan el esfuerzo que metemos',
    dimension: 'comercial',
    icono: '📈',
  },
  {
    id: 'artesanal',
    texto: 'El negocio funciona de manera artesanal y depende 100% de mí',
    dimension: 'empresarial',
    icono: '⚙️',
  },
]

export default function Home() {
  const router = useRouter()
  const [bloqueado, setBloqueado] = useState(false)
  const [datosPrevios, setDatosPrevios] = useState<TelemetryVisitResult['previousResult'] | null>(null)
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const force = params.get('force') === '1'
    const session = cargarSession()
    const sesionIncompleta =
      !force &&
      !session.datos?.whatsapp &&
      Array.isArray(session.respuestas) &&
      session.respuestas.some((r) => r > 0)

    if (sesionIncompleta) {
      router.replace('/diagnostico?resume=1')
      return
    }

    registrarVisitaTemprana(force).then((res) => {
      if (res.blocked && res.previousResult) {
        setBloqueado(true)
        setDatosPrevios(res.previousResult)
        trackFunnel('visita_bloqueada_reintento', { arquetipo: res.previousResult.arquetipo })
      } else {
        trackFunnel('landing_pregunta_0_vista')
      }
    })
  }, [router])

  const handleSeleccionarOpcionCero = (opcion: OpcionCero) => {
    setSeleccionada(opcion.id)
    const p0Data: Pregunta0Data = {
      id: opcion.id,
      texto: opcion.texto,
      dimension: opcion.dimension,
    }
    guardarPregunta0(p0Data)

    trackFunnel('pregunta_0_respondida', {
      opcion_id: opcion.id,
      opcion_texto: opcion.texto,
      dimension: opcion.dimension,
    })

    const search = typeof window !== 'undefined' ? window.location.search : ''
    setTimeout(() => {
      router.push(`/diagnostico${search}`)
    }, 180)
  }

  // --- Vista de Bloqueo Elegante (Breaker Anti-Picardía 72h) ---
  if (bloqueado && datosPrevios) {
    const scores = datosPrevios.scores || {
      personal: 0,
      organizacional: 0,
      comercial: 0,
      empresarial: 0,
    }
    const entries = Object.entries(scores) as [string, number][]
    const ordenadas = entries.sort((a, b) => a[1] - b[1])
    const debil1 = ordenadas[0] ? ordenadas[0][0].toUpperCase() : 'COMERCIAL'
    const debil2 = ordenadas[1] ? ordenadas[1][0].toUpperCase() : 'PERSONAL'

    return (
      <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
        <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 lg:px-16 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mc-amarillo text-mc-tinta text-xs font-bold uppercase tracking-widest mb-6 w-fit">
            <span>🛡️</span> Diagnóstico Previo Registrado
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-4 leading-tight">
            {datosPrevios.nombre ? `${datosPrevios.nombre}, ya` : 'Ya'} calculamos tu diagnóstico estratégico.
          </h1>

          <p className="text-mc-gris text-base sm:text-lg mb-6 leading-relaxed">
            Tu arquetipo identificado es{' '}
            <strong className="text-mc-azul-marino font-bold">
              {datosPrevios.arquetipo || 'LÍDER'}
            </strong>{' '}
            y tus áreas críticas detectadas son{' '}
            <strong className="text-mc-rojo font-bold">{debil1}</strong> y{' '}
            <strong className="text-mc-rojo font-bold">{debil2}</strong>.
          </p>

          <p className="text-sm text-gray-700 mb-8 border-l-2 border-mc-azul pl-4">
            Para garantizar la objetividad del análisis, mantenemos un período de consolidación de 72 horas antes de admitir un nuevo test.
          </p>

          <div className="flex flex-col gap-4">
            <a
              href="https://wa.me/5493764358152?text=Hola%20Sindy,%20hice%20el%20Diagnóstico%20Empresarial%20en%20Mejora%20Continua.%20Quiero%20revisar%20mi%20plan%20de%20acción."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] flex items-center justify-center py-4 px-8 bg-mc-azul hover:bg-mc-azul-marino text-white font-bold rounded-sm text-sm tracking-widest uppercase transition-colors shadow-md"
            >
              HABLAR CON EL EQUIPO POR WHATSAPP →
            </a>

            <button
              onClick={() => {
                const previousSession = {
                  nombre: datosPrevios.nombre || 'Líder',
                  perfil: datosPrevios.arquetipo || 'SATURADO',
                  respuestas: [3, 3, 3, 3, 2, 3, 2, 3],
                  scores: datosPrevios.scores,
                  datos: {
                    nombre: datosPrevios.nombre || 'Líder',
                    whatsapp: datosPrevios.whatsapp || '',
                    codPais: '',
                  },
                }
                sessionStorage.setItem('mc_diagnostico', JSON.stringify(previousSession))
                router.push('/resultado?bloqueado=1')
              }}
              className="w-full min-h-[44px] text-center py-3.5 px-6 border border-gray-300 text-mc-tinta hover:border-mc-azul font-semibold rounded-sm text-sm transition-colors cursor-pointer"
            >
              Ver mi reporte y Plan de 72h
            </button>
          </div>
        </div>
      </DesktopLayout>
    )
  }

  // --- Vista Principal V3: Pregunta Cero Sin Fricción ---
  return (
    <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
      <div className="min-h-[100dvh] flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12 lg:px-16 max-w-2xl mx-auto w-full">
        <div className="lg:hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Mejora Continua" className="h-9 object-contain" />
        </div>

        <div className="mb-2">
          <span className="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-mc-azul bg-mc-azul/10 px-3 py-1 rounded-full">
            DIAGNÓSTICO ESTRATÉGICO 4D · 2 MINUTOS
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-mc-negro mb-3 leading-tight mt-3">
          En tu día a día como líder, ¿qué sentís que te frena más?
        </h1>

        <p className="text-mc-gris text-sm sm:text-base mb-8">
          Elegí el obstáculo más crítico hoy para iniciar tu radiografía operativa:
        </p>

        <div className="flex flex-col gap-3.5 sm:gap-4">
          {OPCIONES_CERO.map((opcion) => {
            const isSelected = seleccionada === opcion.id
            return (
              <button
                key={opcion.id}
                onClick={() => handleSeleccionarOpcionCero(opcion)}
                disabled={!!seleccionada}
                className={`w-full min-h-[56px] text-left p-4 sm:p-5 rounded-md border text-base sm:text-lg transition-all duration-150 flex items-start gap-3.5 sm:gap-4 font-spartan cursor-pointer ${
                  isSelected
                    ? 'border-mc-azul bg-mc-azul text-white shadow-md scale-[0.99]'
                    : 'border-gray-200 bg-white hover:border-mc-azul text-mc-negro hover:bg-gray-50/50 shadow-sm'
                }`}
              >
                <span className="text-xl sm:text-2xl select-none shrink-0 mt-0.5">
                  {opcion.icono}
                </span>
                <span className="font-semibold leading-snug flex-1">
                  {opcion.texto}
                </span>
                <span
                  className={`text-base font-bold shrink-0 self-center ${
                    isSelected ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  →
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 space-y-3">
          <div
            aria-hidden="true"
            className="h-1 w-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, #1A3D84 0%, #1A3D84 60%, #E1061E 60%, #E1061E 80%, #F7CC13 80%, #F7CC13 100%)',
            }}
          />
          <p className="text-[11px] sm:text-xs text-gray-600 text-center">
            Diagnóstico objetivo sin costo comercial. Método desarrollado por Mejora Continua.
          </p>
        </div>
      </div>
    </DesktopLayout>
  )
}
