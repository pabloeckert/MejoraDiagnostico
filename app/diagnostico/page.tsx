'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PREGUNTAS, PREGUNTA_POSICION, type RespuestaPosicion } from '@/lib/preguntas'
import { calcularScores, requierePosicion, detectarPerfil, type Scores } from '@/lib/scoring'
import { guardarRespuestas, guardarPerfil, guardarScores, guardarPosicion, limpiarSession, cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import QuestionCard from '@/components/QuestionCard'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function DiagnosticoPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<'nombre' | 'preguntas' | 'posicion'>('nombre')
  const [nombre, setNombre] = useState('')
  const [errorNombre, setErrorNombre] = useState(false)
  const [shakeNombre, setShakeNombre] = useState(false)
  const [step, setStep] = useState(0)
  const [respuestas, setRespuestas] = useState<number[]>(Array(8).fill(0))
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [btnPulse, setBtnPulse] = useState(false)
  const [scores, setScores] = useState<Scores | null>(null)
  const [posicionSeleccionada, setPosicionSeleccionada] = useState<RespuestaPosicion | null>(null)
  const [posicionAnim, setPosicionAnim] = useState<RespuestaPosicion | null>(null)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [bannerRetomado, setBannerRetomado] = useState(false)

  const preguntaStartRef = useRef<number>(Date.now())
  const tiemposRef = useRef<number[]>(Array(8).fill(0))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const session = cargarSession()
    const esResume = params.get('resume') === '1' || (!!session.nombre && !session.datos?.whatsapp)

    if (esResume) {
      if (session.perfil) {
        // El diagnóstico ya se completó y tiene perfil calculado — solo falta el formulario de contacto
        trackFunnel('sesion_retomada', { pasoRetomado: 'datos' })
        router.replace('/datos')
        return
      }

      if (session.nombre) setNombre(session.nombre)

      let pasoRetomado = 'nombre'
      if (session.scores && !session.posicion) {
        setRespuestas(session.respuestas ?? Array(8).fill(0))
        setScores(session.scores)
        setPaso('posicion')
        pasoRetomado = 'posicion'
      } else if (session.respuestas && session.respuestas.some((v) => v > 0)) {
        const nuevas = session.respuestas
        setRespuestas(nuevas)
        const idx = nuevas.findIndex((v) => v === 0)
        const resumeStep = idx === -1 ? nuevas.length - 1 : idx
        setStep(resumeStep)
        setPaso('preguntas')
        setBannerRetomado(true)
        pasoRetomado = `pregunta_${resumeStep + 1}`
      } else if (session.nombre) {
        setPaso('preguntas')
        setBannerRetomado(true)
        pasoRetomado = 'pregunta_1'
      }
      trackFunnel('sesion_retomada', { pasoRetomado })
    } else {
      limpiarSession()
      sessionStorage.removeItem('mc_nombre')
      trackFunnel('diagnostico_iniciado')
    }

    const lid = params.get('lid')
    if (lid) sessionStorage.setItem('mc_lid', lid)
    else if (!esResume) sessionStorage.removeItem('mc_lid')
  }, [router])

  useEffect(() => {
    const handler = () => trackFunnel('abandono', { paso: 'preguntas' })
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useEffect(() => {
    if (!bannerRetomado) return
    const t = setTimeout(() => setBannerRetomado(false), 4000)
    return () => clearTimeout(t)
  }, [bannerRetomado])

  useEffect(() => {
    setSeleccionada(null)
    setShowScrollHint(true)
    preguntaStartRef.current = Date.now()
  }, [step])

  useEffect(() => {
    if (seleccionada !== null) {
      setBtnPulse(true)
      const t = setTimeout(() => setBtnPulse(false), 400)
      return () => clearTimeout(t)
    }
  }, [seleccionada])

  function handleConfirmarNombre() {
    if (!nombre.trim()) {
      setErrorNombre(true)
      setShakeNombre(true)
      setTimeout(() => setShakeNombre(false), 400)
      if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
        navigator.vibrate([10, 50, 10])
      }
      return
    }
    const session = JSON.parse(sessionStorage.getItem('mc_diagnostico') || '{}')
    session.nombre = nombre.trim()
    sessionStorage.setItem('mc_diagnostico', JSON.stringify(session))
    trackFunnel('nombre_ingresado', { nombre: nombre.trim() })
    setPaso('preguntas')
  }

  const pregunta = paso === 'preguntas' ? PREGUNTAS[step] : null

  function handleSelect(valor: number) {
    setSeleccionada(valor)
    setBannerRetomado(false)
  }

  function finalizarConPerfil(nuevas: number[], s: Scores, pos?: RespuestaPosicion) {
    const perfil = detectarPerfil(s, pos)
    guardarPerfil(perfil)
    guardarScores(s)
    if (pos) guardarPosicion(pos)
    trackFunnel('preguntas_completadas', { respuestas: nuevas, tiempos: tiemposRef.current })
    const lid = typeof window !== 'undefined' ? sessionStorage.getItem('mc_lid') ?? undefined : undefined
    fetch('/api/save-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuestas: nuevas, ...(lid && { lid }) }),
    }).catch(() => {})
    router.replace('/datos')
  }

  function handleSiguiente() {
    if (seleccionada === null) return
    const nuevas = [...respuestas]
    nuevas[step] = seleccionada

    const segundos = Math.round((Date.now() - preguntaStartRef.current) / 1000)
    tiemposRef.current[step] = segundos
    trackFunnel('pregunta_respondida', { numero: step + 1, segundos, valor: seleccionada })

    if (step < PREGUNTAS.length - 1) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator && /android/i.test(navigator.userAgent)) {
        navigator.vibrate([5, 30, 5])
      }
      setRespuestas(nuevas)
      guardarRespuestas(nuevas)
      setTransition('out')
      setTimeout(() => {
        setStep(step + 1)
        setTransition('in')
        setTimeout(() => setTransition('idle'), 250)
      }, 250)
    } else {
      if (typeof window !== 'undefined' && 'vibrate' in navigator && /android/i.test(navigator.userAgent)) {
        navigator.vibrate([10, 50, 10, 50, 20])
      }
      guardarRespuestas(nuevas)
      const s = calcularScores(nuevas)

      if (requierePosicion(s)) {
        setRespuestas(nuevas)
        setScores(s)
        guardarScores(s)
        setTransition('out')
        setTimeout(() => {
          setPaso('posicion')
          setTransition('in')
          setTimeout(() => setTransition('idle'), 250)
        }, 250)
      } else {
        finalizarConPerfil(nuevas, s)
      }
    }
  }

  function handleFinalizarDiagnostico() {
    if (!scores || posicionSeleccionada === null) return
    if (typeof window !== 'undefined' && 'vibrate' in navigator && /android/i.test(navigator.userAgent)) {
      navigator.vibrate([10, 50, 10, 50, 20])
    }
    finalizarConPerfil(respuestas, scores, posicionSeleccionada)
  }

  const mobileHeader = (
    <div className="flex items-center justify-start pl-6 py-4 border-b border-gray-100 lg:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
    </div>
  )

  if (paso === 'nombre') {
    return (
      <DesktopLayout leftContent={<LeftPanel step="nombre" />}>
        <div className="min-h-[100dvh] flex flex-col overflow-y-auto">
          {mobileHeader}

          <div className="max-w-2xl mx-auto w-full px-6 pt-4 sm:pt-6 lg:px-16 lg:py-20 flex flex-col gap-6">
            <p className="text-base lg:text-sm font-bold tracking-widest uppercase text-mc-azul mb-3">
              Antes de empezar
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-4xl font-bold text-mc-negro">
              ¿Cómo te llamás?
            </h1>

            <div>
              <input
                type="text"
                autoFocus
                autoCapitalize="words"
                autoComplete="given-name"
                inputMode="text"
                enterKeyHint="go"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setErrorNombre(false) }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmarNombre()}
                placeholder=""
                className={`w-full bg-transparent text-2xl font-bold text-mc-negro py-3 border-b-2 focus:outline-none transition-colors ${
                  errorNombre ? 'border-red-400' : 'border-mc-gris-claro focus:border-mc-azul'
                } ${shakeNombre ? 'animate-shake' : ''}`}
              />
              {errorNombre && (
                <p className="text-red-500 text-sm mt-2">Ingresá tu nombre para continuar</p>
              )}
              <p className="text-base text-gray-700 lg:text-sm lg:text-gray-500 mt-2">Solo tu nombre. Nada más.</p>
            </div>

            <button
              onClick={handleConfirmarNombre}
              disabled={!nombre.trim()}
              className={`w-full lg:w-auto lg:px-12 min-h-[56px] py-4 text-base font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
                !nombre.trim()
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
              }`}
            >
              EMPEZAR →
            </button>
          </div>
        </div>
      </DesktopLayout>
    )
  }

  if (paso === 'posicion') {
    return (
      <DesktopLayout leftContent={
        <LeftPanel step="preguntas" preguntaIndex={PREGUNTAS.length} />
      }>
        <div className="h-[100dvh] flex flex-col">
          {mobileHeader}

          <div className="max-w-2xl mx-auto w-full px-6 pt-4 sm:pt-6 lg:px-16 lg:py-20 pb-32 lg:pb-12 flex-1 overflow-y-auto">
            <div className={
              transition === 'out' ? 'animate-slide-out-left' :
              transition === 'in'  ? 'animate-slide-in-right' : ''
            }>
              <h2 className="text-4xl font-bold text-mc-negro leading-tight mb-2">
                {PREGUNTA_POSICION.texto}
              </h2>
              <p className="text-base text-gray-700 lg:text-sm lg:text-gray-500 mt-1 mb-6">{PREGUNTA_POSICION.contexto}</p>
              <div className="flex flex-col gap-3" role="radiogroup">
                {PREGUNTA_POSICION.opciones.map((op, i) => {
                  const sel = posicionSeleccionada === op.valor
                  const delayClass = i === 0 ? 'delay-0' : i === 1 ? 'delay-75' : 'delay-150'
                  return (
                    <button
                      key={op.valor}
                      role="radio"
                      aria-checked={sel}
                      onClick={() => {
                        setPosicionSeleccionada(op.valor)
                        setPosicionAnim(op.valor)
                        setTimeout(() => setPosicionAnim(null), 250)
                      }}
                      className={`w-full text-left px-5 py-5 min-h-[64px] text-lg sm:text-xl font-medium rounded-md border-[1.5px] transition-all duration-150 active:scale-[0.98] active:bg-blue-50 animate-fade-up ${delayClass} ${
                        sel
                          ? 'bg-mc-azul border-mc-azul text-white font-semibold'
                          : 'bg-white border-gray-200 text-mc-negro cursor-pointer'
                      } ${posicionAnim === op.valor ? 'animate-option-pop' : ''}`}
                    >
                      {op.texto}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Botón fijo al fondo — mobile */}
          <div
            className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-100 px-4 pt-3 lg:hidden"
            style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={handleFinalizarDiagnostico}
              disabled={posicionSeleccionada === null}
              className={`w-full min-h-[56px] py-4 text-base font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
                posicionSeleccionada === null
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
              }`}
            >
              VER MI DIAGNÓSTICO →
            </button>
          </div>

          {/* Botón desktop — inline */}
          <div className="hidden lg:block max-w-2xl mx-auto w-full px-16 pb-12">
            <button
              onClick={handleFinalizarDiagnostico}
              disabled={posicionSeleccionada === null}
              className={`lg:px-12 min-h-[56px] py-4 text-base font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
                posicionSeleccionada === null
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
              }`}
            >
              VER MI DIAGNÓSTICO →
            </button>
          </div>
        </div>
      </DesktopLayout>
    )
  }

  return (
    <DesktopLayout leftContent={
      <LeftPanel
        step="preguntas"
        preguntaIndex={step}
      />
    }>
      <div className="h-[100dvh] flex flex-col">
        {mobileHeader}

        <div
          className="max-w-2xl mx-auto w-full px-6 pt-4 sm:pt-6 lg:px-16 lg:py-20 pb-32 lg:pb-12 flex-1 overflow-y-auto"
          onScroll={(e) => {
            if (e.currentTarget.scrollTop > 20) setShowScrollHint(false)
            else setShowScrollHint(true)
          }}
        >
          <div className="overflow-x-hidden">
            <div className={
              transition === 'out' ? 'animate-slide-out-left' :
              transition === 'in'  ? 'animate-slide-in-right' : ''
            }>
              {bannerRetomado && (
                <div className="bg-mc-azul/10 text-mc-azul text-sm font-semibold px-4 py-2 rounded-md mb-4 text-center">
                  Retomamos donde lo dejaste
                </div>
              )}
              <div className="w-full h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
                <div
                  className="h-full bg-mc-azul rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.round((step / PREGUNTAS.length) * 100)}%` }}
                />
              </div>
              <p className="text-base text-gray-700 lg:text-sm lg:text-gray-600 mb-2">
                Pregunta {step + 1} de {PREGUNTAS.length}
              </p>
              <QuestionCard
                texto={pregunta!.texto}
                numero={step + 1}
                preguntaIndex={step}
                contexto={pregunta!.contexto}
                opciones={pregunta!.opciones}
                seleccionada={seleccionada}
                onSelect={handleSelect}
              />
            </div>
          </div>
          <div
            className={`sticky bottom-0 left-0 right-0 h-12 pointer-events-none transition-opacity duration-300 ${showScrollHint ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)' }}
          />
        </div>

        {/* Botón fijo al fondo — mobile */}
        <div
          className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-100 px-4 pt-3 lg:hidden"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSiguiente}
            disabled={seleccionada === null}
            className={`w-full min-h-[56px] py-4 text-base font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
              btnPulse ? 'animate-btn-activate' : ''
            } ${
              seleccionada === null
                ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
            }`}
          >
            {step < PREGUNTAS.length - 1 ? 'SIGUIENTE →' : 'VER MI DIAGNÓSTICO →'}
          </button>
        </div>

        {/* Botón desktop — inline */}
        <div className="hidden lg:block max-w-2xl mx-auto w-full px-16 pb-12">
          <button
            onClick={handleSiguiente}
            disabled={seleccionada === null}
            className={`lg:px-12 min-h-[56px] py-4 text-base font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
              btnPulse ? 'animate-btn-activate' : ''
            } ${
              seleccionada === null
                ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
            }`}
          >
            {step < PREGUNTAS.length - 1 ? 'SIGUIENTE →' : 'VER MI DIAGNÓSTICO →'}
          </button>
        </div>
      </div>
    </DesktopLayout>
  )
}
