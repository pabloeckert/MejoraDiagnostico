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
  const [momento, setMomento] = useState<'A' | 'B'>('A')
  const [transicion, setTransicion] = useState<'idle' | 'out' | 'in'>('idle')

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
      <div className="min-h-[100dvh] bg-white">
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

  const irAMomentoB = () => {
    setTransicion('out')
    setTimeout(() => {
      setMomento('B')
      setTransicion('in')
      setTimeout(() => setTransicion('idle'), 250)
    }, 250)
  }

  return (
    <DesktopLayout leftContent={
      <LeftPanel step="resultado" perfilTag={p.tag} perfilRef={p.ref} />
    }>
      {/* === MOBILE LAYOUT — 2 momentos === */}
      <div className="lg:hidden">

        {/* MOMENTO A — impacto azul */}
        {momento === 'A' && (
          <div
            className="h-[100dvh] bg-mc-azul flex flex-col justify-between px-8 py-12"
            style={{ animation: 'fadeUp 0.5s ease forwards' }}
          >
            {/* Tag del perfil */}
            <p className="text-sm font-bold tracking-widest uppercase text-white opacity-70">
              {p.tag}
            </p>

            {/* Verdad central */}
            <div className="flex-1 flex items-center">
              <p className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                {p.verdad}
              </p>
            </div>

            {/* Botón para continuar */}
            <button
              onClick={irAMomentoB}
              className="w-full min-h-[56px] bg-white text-mc-azul font-bold uppercase tracking-widest text-base rounded-sm transition-colors duration-200 px-6"
            >
              VER MI DIAGNÓSTICO COMPLETO →
            </button>
          </div>
        )}

        {/* MOMENTO B — data completa */}
        {momento === 'B' && (
          <div
            className="h-[100dvh] overflow-y-auto bg-white"
            style={{ animation: transicion === 'in' ? 'slideInRight 0.35s ease forwards' : 'none' }}
          >
            <div className="px-6 py-8 max-w-lg">

              {/* Logo + tag */}
              <div className="flex items-center mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-color.png" alt="Mejora Continua" className="h-8 object-contain" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-mc-azul mb-6">
                {p.tag}
              </p>

              {/* Descripción — el gancho */}
              <p className="text-lg text-gray-800 leading-relaxed mb-8">
                {p.desc}
              </p>

              {/* Puntaje — integrado, no grotesco */}
              <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-100">
                <span className="text-4xl font-bold" style={{ color: globalColor }}>{globalPct}%</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Puntaje global</span>
                  <span className="text-xs uppercase tracking-widest" style={{ color: globalColor }}>{globalZona}</span>
                </div>
              </div>

              {/* Barras — más delgadas, más chicas */}
              <div className="mb-8">
                {areas.map((area, i) => (
                  <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 200} />
                ))}
              </div>

              {/* Separador visual */}
              <div className="border-t border-gray-100 pt-8 mb-6">
                <h2 className="text-2xl font-bold text-mc-negro mb-3 leading-tight">
                  {p.cierreTitulo}
                </h2>
                <p className="text-base text-gray-700 leading-relaxed mb-8">
                  {p.cierreTxt}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleCTA}
                className="w-full min-h-[56px] bg-mc-azul text-white font-bold py-4 text-sm tracking-widest uppercase transition-colors duration-200 rounded-sm mb-12"
              >
                {p.cta}
              </button>

              <a
                href="https://mejoraok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-gray-500 underline mt-4"
              >
                Volver a mejoraok.com
              </a>

            </div>
          </div>
        )}

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
            <a
              href="https://mejoraok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-gray-500 underline mt-4"
            >
              Volver a mejoraok.com
            </a>
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
