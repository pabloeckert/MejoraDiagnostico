'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { useInView } from '@/hooks/useInView'
import { trackFunnel } from '@/lib/funnel'
import { PERFILES } from '@/lib/perfiles'
import { zonaColor, areasParaMostrar } from '@/lib/areas'
import type { Scores } from '@/lib/scoring'
import AreaBar from '@/components/AreaBar'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession, DatosContacto } from '@/hooks/useDiagnostico'

// Entrada progresiva al scrollear: recompensa seguir bajando (curiosity gap /
// progressive disclosure) en vez de mostrar todo de una — misma lógica en
// mobile y desktop, solo cambia qué se agrupa en cada bloque.
function revealStyle(visible: boolean, delayMs = 0): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delayMs}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, background-color 200ms ease`,
  }
}

// Aparición del CTA final: en vez del fade+slide genérico, un "pop" con
// pequeño overshoot (isolation/Von Restorff effect) — el botón se planta
// como la respuesta, no como un bloque más que entra en fila.
function solutionRevealStyle(visible: boolean, delayMs = 0): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(10px)',
    transition: `opacity 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delayMs}ms, transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delayMs}ms`,
  }
}

// Tipeo del título de cierre: la lectura activa (seguir el cursor) retiene
// más atención que un texto que aparece de golpe — se usa solo en el título,
// no en el párrafo largo, para no demorar la llegada al CTA.
function useTypewriter(texto: string, activo: boolean, velocidadMs: number) {
  const [largo, setLargo] = useState(0)
  useEffect(() => {
    if (!activo) return
    setLargo(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setLargo(i)
      if (i >= texto.length) clearInterval(id)
    }, velocidadMs)
    return () => clearInterval(id)
  }, [activo, texto, velocidadMs])
  return largo
}

// Pista de scroll: banda con blur progresivo (backdrop-filter + máscara, se
// adapta a cualquier color de fondo) + "Seguí bajando" — el corte visual
// insinúa contenido incompleto (Zeigarnik) sin tapar nada, invita a bajar.
function PistaScroll({ visible }: { visible: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed bottom-0 inset-x-0 h-28 sm:h-32 pointer-events-none z-[5] transition-opacity duration-500"
        style={{
          opacity: visible ? 1 : 0,
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          maskImage: 'linear-gradient(to bottom, transparent, black 78%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 78%)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 px-6 py-3 rounded-sm pointer-events-none transition-opacity duration-500"
        style={{
          opacity: visible ? 1 : 0,
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.92), transparent)',
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-mc-gris">Seguí bajando</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mc-gris animate-bounce-soft">
          <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  )
}

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)
  const [momento, setMomento] = useState<'A' | 'B'>('A')
  const [transicion, setTransicion] = useState<'idle' | 'out' | 'in'>('idle')
  const [mostrarScrollHint, setMostrarScrollHint] = useState(true)
  const yaLlegoAlFinal = useRef(false)
  const [mobileScrollEl, setMobileScrollEl] = useState<HTMLDivElement | null>(null)
  const [mostrarScrollHintMobile, setMostrarScrollHintMobile] = useState(true)

  const dDesc = useInView<HTMLParagraphElement>()
  const dScore = useInView<HTMLDivElement>()
  const dCierre = useInView<HTMLDivElement>()
  const mDesc = useInView<HTMLParagraphElement>()
  const mScore = useInView<HTMLDivElement>()
  const mCierre = useInView<HTMLDivElement>()
  const [dPulse, setDPulse] = useState(false)
  const [mPulse, setMPulse] = useState(false)

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
    if (!mobileScrollEl) return
    const onScroll = () => {
      const cercaDelFinal = mobileScrollEl.scrollTop + mobileScrollEl.clientHeight >= mobileScrollEl.scrollHeight - 24
      setMostrarScrollHintMobile(!cercaDelFinal)
    }
    onScroll()
    mobileScrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => mobileScrollEl.removeEventListener('scroll', onScroll)
  }, [mobileScrollEl])

  // Timing del cierre: título tipeado primero, párrafo y botón entran
  // después, escalonados según cuánto tarda en "terminar de escribirse"
  // el título — así el CTA siempre llega como remate, nunca superpuesto.
  const TYPEWRITER_MS = 20
  const cierreTituloTexto = session?.perfil ? PERFILES[session.perfil as PerfilKey].cierreTitulo : ''
  const tituloLargo = useTypewriter(cierreTituloTexto, dCierre.inView || mCierre.inView, TYPEWRITER_MS)
  const tituloTypingMs = cierreTituloTexto.length * TYPEWRITER_MS
  const parrafoDelayMs = tituloTypingMs + 200
  const botonDelayMs = tituloTypingMs + 550

  useEffect(() => {
    if (!dCierre.inView) return
    const t = setTimeout(() => setDPulse(true), botonDelayMs + 600)
    return () => clearTimeout(t)
  }, [dCierre.inView, botonDelayMs])

  useEffect(() => {
    if (!mCierre.inView) return
    const t = setTimeout(() => setMPulse(true), botonDelayMs + 600)
    return () => clearTimeout(t)
  }, [mCierre.inView, botonDelayMs])

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
            ref={setMobileScrollEl}
            className="h-[100dvh] overflow-y-auto overscroll-y-contain bg-white"
            style={{ animation: transicion === 'in' ? 'slideInRight 0.35s ease forwards' : 'none' }}
          >
            <PistaScroll visible={mostrarScrollHintMobile} />
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
              <p
                ref={mDesc.ref}
                style={revealStyle(mDesc.inView)}
                className="text-lg text-gray-800 leading-relaxed mb-8"
              >
                {p.desc}
              </p>

              <div ref={mScore.ref} style={revealStyle(mScore.inView)}>
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
                    <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 200} start={mScore.inView} />
                  ))}
                </div>
              </div>

              {/* Separador visual */}
              <div ref={mCierre.ref} className="border-t border-gray-100 pt-8 mb-6">
                <h2 aria-label={p.cierreTitulo} className="text-2xl font-bold text-mc-negro mb-3 leading-tight">
                  <span aria-hidden="true">
                    {cierreTituloTexto.slice(0, tituloLargo)}
                    {mCierre.inView && tituloLargo < cierreTituloTexto.length && (
                      <span className="inline-block w-[2px] h-[0.9em] bg-mc-negro ml-[2px] align-middle animate-blink-cursor" />
                    )}
                  </span>
                </h2>
                <p style={revealStyle(mCierre.inView, parrafoDelayMs)} className="text-base text-gray-700 leading-relaxed mb-8">
                  {p.cierreTxt}
                </p>
              </div>

              {/* CTA — aparece como la respuesta, no como un bloque más */}
              <button
                onClick={handleCTA}
                style={solutionRevealStyle(mCierre.inView, botonDelayMs)}
                className={`w-full min-h-[56px] bg-mc-azul text-white font-bold py-4 text-sm tracking-widest uppercase transition-colors duration-200 rounded-sm mb-12 ${mPulse ? 'animate-btn-activate' : ''}`}
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

        <PistaScroll visible={mostrarScrollHint} />

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

          <p
            ref={dDesc.ref}
            style={revealStyle(dDesc.inView)}
            className="text-lg text-mc-gris leading-relaxed mb-10 max-w-2xl"
          >
            {p.desc}
          </p>

          <div ref={dScore.ref} style={revealStyle(dScore.inView)}>
            <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-gray-100">
              <span className="text-6xl font-bold" style={{ color: globalColor }}>{globalPctMostrado}%</span>
              <span className="text-sm text-mc-gris uppercase tracking-widest">puntaje global · {globalZona}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-6">
              {areas.map((area, i) => (
                <AreaBar key={area.nombre} nombre={area.nombre} porcentaje={area.porcentaje} delay={i * 150} start={dScore.inView} />
              ))}
            </div>
          </div>

        </div>

        {/* Cierre — franja celeste pálido, ancho completo */}
        <div ref={dCierre.ref} className="w-full bg-mc-azul/5">
          <div className="max-w-3xl mx-auto px-10 py-16 text-center">
            <h2 aria-label={p.cierreTitulo} className="text-2xl font-bold text-mc-azul mb-4">
              <span aria-hidden="true">
                {cierreTituloTexto.slice(0, tituloLargo)}
                {dCierre.inView && tituloLargo < cierreTituloTexto.length && (
                  <span className="inline-block w-[2px] h-[0.9em] bg-mc-azul ml-[2px] align-middle animate-blink-cursor" />
                )}
              </span>
            </h2>
            <p style={revealStyle(dCierre.inView, parrafoDelayMs)} className="text-base text-mc-negro leading-relaxed mb-8 max-w-xl mx-auto">
              {p.cierreTxt}
            </p>
            <button
              onClick={handleCTA}
              style={solutionRevealStyle(dCierre.inView, botonDelayMs)}
              className={`bg-mc-azul hover:bg-mc-azul-marino text-white font-bold px-10 py-4 text-sm tracking-widest uppercase transition-colors duration-200 rounded-sm ${dPulse ? 'animate-btn-activate' : ''}`}
            >
              {p.cta}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
