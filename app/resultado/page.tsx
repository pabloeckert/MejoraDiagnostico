'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas } from '@/lib/areas'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession, DatosContacto } from '@/hooks/useDiagnostico'

function getAreaStyle(pct: number): { bg: string; borderColor: string; textColor: string } {
  if (pct < 40) return { bg: '#FEF2F2', borderColor: '#C0392B', textColor: '#991B1B' }
  if (pct < 65) return { bg: '#FFF7ED', borderColor: '#E67E22', textColor: '#92400E' }
  return { bg: '#F0FDF4', borderColor: '#27AE60', textColor: '#166534' }
}

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)

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

  const handleCTA = async () => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datos.nombre,
          whatsapp: datos.whatsapp,
          codPais: datos.codPais,
          perfil: perfilKey,
        }),
      })
    } catch (e) {
      console.error('Notify error:', e)
    }
    router.push('/gracias')
  }

  return (
    <DesktopLayout leftContent={
      <LeftPanel
        step="resultado"
        perfilTag={p.tag}
        perfilRef={p.ref}
      />
    }>
      <div className="min-h-[100dvh]">
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mejora Continua" className="h-10" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:px-16 lg:py-20">

          {/* Verdad central */}
          <div className="mb-10">
            <p className="text-2xl sm:text-3xl font-bold text-mc-negro leading-snug">
              {p.verdad}
            </p>
          </div>

          {/* Descripción */}
          <p className="text-mc-gris text-lg leading-relaxed mb-10">
            {p.desc}
          </p>

          {/* Áreas — cards con color */}
          <div className="mb-10">
            {areas.map((area) => {
              const style = getAreaStyle(area.porcentaje)
              return (
                <div
                  key={area.nombre}
                  className="flex items-center justify-between p-4 rounded-lg mb-3"
                  style={{
                    backgroundColor: style.bg,
                    borderLeft: `4px solid ${style.borderColor}`,
                  }}
                >
                  <span className="font-semibold text-sm" style={{ color: style.textColor }}>
                    {area.nombre}
                  </span>
                  <span className="font-bold text-lg" style={{ color: style.borderColor }}>
                    {area.porcentaje}%
                  </span>
                </div>
              )
            })}
          </div>

          {/* Cierre */}
          <div className="mt-10 mb-6">
            <h2 className="text-2xl font-bold text-mc-negro mb-3">
              {p.cierreTitulo}
            </h2>
            <p className="text-mc-gris leading-relaxed">
              {p.cierreTxt}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            className="w-full bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-5 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200"
          >
            {p.cta}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-mc-gris pt-8 mt-8 border-t border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-5" />
            <span className="font-bold tracking-widest uppercase">Mejora Continua</span>
          </div>
        </div>
      </div>
    </DesktopLayout>
  )
}
