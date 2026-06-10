'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PREGUNTAS } from '@/lib/preguntas'
import { detectarPerfil } from '@/lib/detectar'
import { guardarRespuestas, guardarPerfil } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
import QuestionCard from '@/components/QuestionCard'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function DiagnosticoPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<'nombre' | 'preguntas'>('nombre')
  const [nombre, setNombre] = useState('')
  const [errorNombre, setErrorNombre] = useState(false)
  const [shakeNombre, setShakeNombre] = useState(false)
  const [step, setStep] = useState(0)
  const [respuestas, setRespuestas] = useState<number[]>(Array(8).fill(0))
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [btnPulse, setBtnPulse] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mc_diagnostico')
      sessionStorage.removeItem('mc_nombre')
      const lid = new URLSearchParams(window.location.search).get('lid')
      if (lid) sessionStorage.setItem('mc_lid', lid)
      else sessionStorage.removeItem('mc_lid')
      trackFunnel('diagnostico_iniciado')
    }
  }, [])

  useEffect(() => {
    const handler = () => trackFunnel('abandono', { paso: 'preguntas' })
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useEffect(() => {
    setSeleccionada(null)
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
  }

  function handleSiguiente() {
    if (seleccionada === null) return
    const nuevas = [...respuestas]
    nuevas[step] = seleccionada

    if (step < PREGUNTAS.length - 1) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator && /android/i.test(navigator.userAgent)) {
        navigator.vibrate([5, 30, 5])
      }
      setRespuestas(nuevas)
      setTransition('out')
      setTimeout(() => {
        setStep(step + 1)
        setTransition('in')
        setTimeout(() => setTransition('idle'), 220)
      }, 180)
    } else {
      if (typeof window !== 'undefined' && 'vibrate' in navigator && /android/i.test(navigator.userAgent)) {
        navigator.vibrate([10, 50, 10, 50, 20])
      }
      guardarRespuestas(nuevas)
      const perfil = detectarPerfil(nuevas)
      guardarPerfil(perfil)
      trackFunnel('preguntas_completadas', { respuestas: nuevas })

      const lid = typeof window !== 'undefined' ? sessionStorage.getItem('mc_lid') ?? undefined : undefined
      fetch('/api/save-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: nuevas, ...(lid && { lid }) }),
      }).catch(() => {})

      router.replace('/datos')
    }
  }

  if (paso === 'nombre') {
    return (
      <DesktopLayout leftContent={<LeftPanel step="nombre" />}>
        <div className="min-h-[100dvh] flex flex-col">
          <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
          </div>

          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-16 lg:px-16 lg:py-20 flex flex-col gap-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro">
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
            </div>

            <button
              onClick={handleConfirmarNombre}
              disabled={!nombre.trim()}
              className={`w-full lg:w-auto lg:px-12 min-h-[52px] py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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

  return (
    <DesktopLayout leftContent={
      <LeftPanel
        step="preguntas"
        preguntaNum={step + 1}
      />
    }>
      <div className="min-h-[100dvh] flex flex-col">
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
        </div>

        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 lg:px-16 lg:py-20 pb-28 lg:pb-12">
          <div className="overflow-x-hidden">
            <div className={
              transition === 'out' ? 'animate-slide-out-left' :
              transition === 'in'  ? 'animate-slide-in-right' : ''
            }>
              <QuestionCard
                texto={pregunta!.texto}
                numero={step + 1}
                opciones={pregunta!.opciones}
                seleccionada={seleccionada}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </div>

        {/* Botón fijo al fondo — mobile */}
        <div
          className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-100 px-4 pt-3 lg:hidden"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSiguiente}
            disabled={seleccionada === null}
            className={`w-full min-h-[52px] py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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
            className={`lg:px-12 min-h-[52px] py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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
