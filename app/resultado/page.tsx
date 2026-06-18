'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import { PERFILES } from '@/lib/perfiles'
import { zonaColor, areasParaMostrar } from '@/lib/areas'
import type { Scores } from '@/lib/scoring'
import AreaBar from '@/components/AreaBar'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession, DatosContacto } from '@/hooks/useDiagnostico'

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)

  useEffect(() => {
    const s = cargarSession()
    if (!s.perfil || !s.respuestas || !s.datos?.whatsapp || !s.scores) {
      router.replace('/')
      return
    }
    setSession(s)
    trackFunnel('resultado_visto', { perfil: s.perfil, whatsapp: s.datos.whatsapp })
  }, [router])

  if (!session?.perfil || !session?.respuestas || !session?.scores) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mc-azul border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const perfilKey = session.perfil as PerfilKey
  const p = PERFILES[perfilKey]
  const datos = session.datos as DatosContacto
  const scoresData = session.scores as Scores

  const areas = areasParaMostrar(scoresData)

  const globalPct = Math.round(
    (scoresData.personal + scoresData.organizacional + scoresData.comercial + scoresData.empresarial) / 4
  )
  const { color: globalColor, zona: globalZona } = zonaColor(globalPct)

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
      {/* Mobile header */}
      <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
      </div>

      {/* === MOBILE LAYOUT === */}
      <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12 lg:hidden">

        <p className="text-sm font-bold tracking-widest uppercase text-mc-azul mb-4">
          {p.tag}
        </p>

        {/* 1. Verdad central */}
        <div className="bg-mc-azul-marino text-white px-8 py-12 -mx-6 sm:-mx-16 mb-10">
          <p className="text-3xl sm:text-4xl font-bold leading-snug max-w-xl">
            {p.verdad}
          </p>
        </div>

        {/* 2. Descripción */}
        <p className="text-mc-gris text-xl leading-relaxed mb-10 max-w-lg">
          {p.desc}
        </p>

        {/* 3. Puntaje global */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-5xl font-bold" style={{ color: globalColor }}>{globalPct}%</span>
          <span className="text-sm text-mc-gris uppercase tracking-widest">puntaje global · {globalZona}</span>
        </div>

        {/* 4. Barras de área */}
        <div className="mb-8">
          {areas.map((area, i) => (
            <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 150} />
          ))}
        </div>

        {/* 5. Cierre */}
        <div className="mt-12 mb-6 max-w-lg">
          <h2 className="text-3xl font-bold text-mc-negro mb-3 uppercase">
            {p.cierreTitulo}
          </h2>
          <p className="text-lg text-mc-gris leading-relaxed mb-8">
            {p.cierreTxt}
          </p>
        </div>

        {/* 6. CTA */}
        <button
          onClick={handleCTA}
          className="w-full min-h-[64px] bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-6 text-base tracking-widest uppercase transition-colors duration-200 rounded-sm"
        >
          {p.cta}
        </button>

      </div>

      {/* === DESKTOP LAYOUT — dashboard sin scroll === */}
      <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6
                      lg:h-[calc(100vh-80px)] lg:overflow-hidden
                      lg:px-10 lg:mt-10">

        {/* Columna izquierda — col-span-2 */}
        <div className="lg:col-span-2 flex flex-col h-full">

          {/* Verdad central */}
          <div className="bg-mc-azul-marino text-white px-6 py-6 rounded-lg mb-4">
            <p className="text-lg font-bold leading-snug">
              {p.verdad}
            </p>
          </div>

          {/* Descripción */}
          <p className="text-mc-gris text-sm leading-relaxed flex-1 px-1 line-clamp-4">
            {p.desc}
          </p>

          {/* Cierre + CTA pegados al fondo */}
          <div className="mt-auto">
            <h2 className="text-base font-bold uppercase text-mc-negro mb-1">
              {p.cierreTitulo}
            </h2>
            <p className="text-xs text-mc-gris mb-4 line-clamp-2">
              {p.cierreTxt}
            </p>
            <button
              onClick={handleCTA}
              className="w-full bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-3 text-xs tracking-widest uppercase transition-colors duration-200 rounded-sm"
            >
              {p.cta}
            </button>
          </div>
        </div>

        {/* Columna derecha — col-span-3 */}
        <div className="lg:col-span-3 flex flex-col justify-center h-full gap-4 pl-4">

          {/* Puntaje global */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-5xl font-bold" style={{ color: globalColor }}>{globalPct}%</span>
            <span className="text-xs text-mc-gris uppercase tracking-widest">puntaje global · {globalZona}</span>
          </div>

          {/* 4 barras de área */}
          <div className="w-full">
            {areas.map((area, i) => (
              <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 150} />
            ))}
          </div>
        </div>

      </div>
    </DesktopLayout>
  )
}
