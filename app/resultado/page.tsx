'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import { PERFILES } from '@/lib/perfiles'
import { zonaColor, areasParaMostrar } from '@/lib/areas'
import type { Scores } from '@/lib/scoring'
import AreaBar from '@/components/AreaBar'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession, DatosContacto } from '@/hooks/useDiagnostico'

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)
  const [momento, setMomento] = useState<'A' | 'B'>('A')
  const [transicion, setTransicion] = useState<'idle' | 'out' | 'in'>('idle')
  const [mostrarScrollHint, setMostrarScrollHint] = useState(true)
  const yaLlegoAlFinal = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (yaLlegoAlFinal.current) return
      const cercaDelFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24
      if (cercaDelFinal) {
        yaLlegoAlFinal.current = true
        setMostrarScrollHint(false)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

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
  const globalPctMostrado = Math.min(98, globalPct)
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
    <div className="min-h-[100dvh] bg-white">
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
                <span className="text-4xl font-bold" style={{ color: globalColor }}>{globalPctMostrado}%</span>
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

            </div>
          </div>
        )}

      </div>

      {/* === DESKTOP LAYOUT — flujo vertical, una columna === */}
      <div className="hidden lg:block">

        {/* Header */}
        <div className="max-w-4xl mx-auto px-10 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Mejora Continua" className="h-16 object-contain" />
        </div>

        {mostrarScrollHint && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 hidden lg:flex flex-col items-center gap-1 px-6 py-3 rounded-sm pointer-events-none transition-opacity duration-500"
               style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.92), transparent)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-mc-gris">Seguí bajando</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mc-gris">
              <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Franja navy — ancho completo, momento de impacto */}
        <div className="w-full bg-mc-azul-marino relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-10 py-16">
            <p className="text-sm font-bold uppercase tracking-widest text-mc-amarillo mb-4">
              {p.tag}
            </p>
            <p className="text-4xl font-bold text-white leading-tight max-w-3xl">
              {p.verdad}
            </p>
          </div>
          <div className="absolute -bottom-6 right-10 w-16 h-16 rounded-full bg-mc-amarillo opacity-90"></div>
        </div>

        {/* Contenido — columna de lectura centrada */}
        <div className="max-w-4xl mx-auto px-10 py-14">

          <p className="text-lg text-mc-gris leading-relaxed mb-10 max-w-2xl">
            {p.desc}
          </p>

          <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-gray-100">
            <span className="text-6xl font-bold" style={{ color: globalColor }}>{globalPctMostrado}%</span>
            <span className="text-sm text-mc-gris uppercase tracking-widest">puntaje global · {globalZona}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-6">
            {areas.map((area, i) => (
              <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 150} />
            ))}
          </div>

        </div>

        {/* Cierre — franja celeste pálido, ancho completo */}
        <div className="w-full bg-mc-azul/5">
          <div className="max-w-3xl mx-auto px-10 py-16 text-center">
            <h2 className="text-2xl font-bold text-mc-azul mb-4">
              {p.cierreTitulo}
            </h2>
            <p className="text-base text-mc-negro leading-relaxed mb-8 max-w-xl mx-auto">
              {p.cierreTxt}
            </p>
            <button
              onClick={handleCTA}
              className="bg-mc-azul hover:bg-mc-azul-marino text-white font-bold px-10 py-4 text-sm tracking-widest uppercase transition-colors duration-200 rounded-sm"
            >
              {p.cta}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
