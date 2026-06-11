'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas } from '@/lib/areas'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import GaugeGlobal from '@/components/GaugeGlobal'
import GaugeArea from '@/components/GaugeArea'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession, DatosContacto } from '@/hooks/useDiagnostico'

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)
  const [gaugeReady, setGaugeReady] = useState(false)

  useEffect(() => {
    const s = cargarSession()
    if (!s.perfil || !s.respuestas || !s.datos?.whatsapp) {
      router.replace('/')
      return
    }
    setSession(s)
    trackFunnel('resultado_visto', { perfil: s.perfil, whatsapp: s.datos.whatsapp })
  }, [router])

  if (!session?.perfil || !session?.respuestas) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mc-azul border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const perfilKey = session.perfil as PerfilKey
  const p = PERFILES[perfilKey]
  const areas = calcularAreas(session.respuestas)
  const datos = session.datos as DatosContacto

  const totalRespuestas = session.respuestas.reduce((a, b) => a + b, 0)
  const globalPct = Math.round((totalRespuestas / 32) * 100)

  const handleCTA = async () => {
    trackFunnel('cta_click', { perfil: perfilKey })
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: session.datos?.nombre ?? '',
          whatsapp: (session.datos?.codPais ?? '') + (session.datos?.whatsapp ?? ''),
          codPais: session.datos?.codPais ?? '',
          perfil: perfilKey,
          parcial: false,
        }),
      })
    } catch (e) {
      console.error('Notify error:', e)
    }
    router.push('/gracias')
  }

  return (
    <DesktopLayout leftContent={
      <LeftPanel step="resultado" perfilTag={p.tag} perfilRef={p.ref} />
    }>
      <div className="min-h-[100dvh]">
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12 lg:px-16 lg:py-20">

          {/* 1. Verdad central */}
          <div className="bg-mc-azul-marino text-white px-8 py-12 -mx-6 sm:-mx-16 mb-10">
            <p className="text-2xl sm:text-3xl font-bold leading-snug max-w-xl">
              {p.verdad}
            </p>
          </div>

          {/* 2. Descripción */}
          <p className="text-mc-gris text-lg leading-relaxed mb-10 max-w-lg">
            {p.desc}
          </p>

          {/* 3. Gauge global */}
          {!gaugeReady && (
            <p className="text-sm text-gray-400 text-center mb-2">
              Analizando tu diagnóstico...
            </p>
          )}
          <GaugeGlobal value={globalPct} onComplete={() => setGaugeReady(true)} />

          {/* 4. Gauges de área — grid en mobile, flex en desktop */}
          <div className="grid grid-cols-3 gap-3 mb-8 justify-items-center sm:flex sm:flex-row sm:justify-center sm:gap-4">
            {areas.map((area, i) => (
              <div key={area.nombre} className="flex flex-col items-center min-w-[90px] text-center">
                <GaugeArea value={area.porcentaje} delayMs={i * 400} />
                <p className="text-[10px] text-center text-gray-500 leading-tight mt-1 px-1 max-w-[80px]">
                  {area.nombre}
                </p>
              </div>
            ))}
          </div>

          {/* 5. Cierre */}
          <div className="mt-12 mb-6 max-w-lg">
            <h2 className="text-2xl font-bold text-mc-negro mb-3 uppercase">
              {p.cierreTitulo}
            </h2>
            <p className="text-mc-gris leading-relaxed mb-8">
              {p.cierreTxt}
            </p>
          </div>

          {/* 6. CTA */}
          <button
            onClick={handleCTA}
            className="w-full bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-5 text-sm tracking-widest uppercase transition-colors duration-200 rounded-sm"
          >
            {p.cta}
          </button>

        </div>
      </div>
    </DesktopLayout>
  )
}
