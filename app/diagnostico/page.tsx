'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PREGUNTAS } from '@/lib/preguntas'
import { AREAS } from '@/lib/areas'
import { detectarPerfil } from '@/lib/detectar'
import { guardarRespuestas, guardarPerfil } from '@/hooks/useDiagnostico'
import ProgressBar from '@/components/ProgressBar'
import QuestionCard from '@/components/QuestionCard'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function DiagnosticoPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [respuestas, setRespuestas] = useState<number[]>(Array(8).fill(0))
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle')
  const [btnPulse, setBtnPulse] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mc_diagnostico')
    }
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

  const pregunta = PREGUNTAS[step]
  const areaNombre = AREAS[pregunta.area].nombre

  function handleSelect(valor: number) {
    setSeleccionada(valor)
  }

  function handleSiguiente() {
    if (seleccionada === null) return
    const nuevas = [...respuestas]
    nuevas[step] = seleccionada
    setRespuestas(nuevas)

    if (step < PREGUNTAS.length - 1) {
      setTransition('out')
      setTimeout(() => {
        setStep(step + 1)
        setTransition('in')
        setTimeout(() => setTransition('idle'), 220)
      }, 180)
    } else {
      guardarRespuestas(nuevas)
      const perfil = detectarPerfil(nuevas)
      guardarPerfil(perfil)
      router.replace('/datos')
    }
  }

  return (
    <DesktopLayout leftContent={
      <LeftPanel
        step="preguntas"
        preguntaNum={step + 1}
        areaNombre={areaNombre}
      />
    }>
      <div className="min-h-screen flex flex-col">
        {/* Header — oculto en desktop, el logo está en el panel izquierdo */}
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mejora Continua" className="h-7" />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 lg:px-16 lg:py-20 flex flex-col overflow-hidden">
          <ProgressBar current={step + 1} total={PREGUNTAS.length} />

          <div className={`flex-1 ${
            transition === 'out' ? 'animate-slide-out-left' :
            transition === 'in'  ? 'animate-slide-in-right' : ''
          }`}>
            <QuestionCard
              texto={pregunta.texto}
              numero={step + 1}
              opciones={pregunta.opciones}
              seleccionada={seleccionada}
              onSelect={handleSelect}
            />
          </div>

          <div className="mt-8 pb-4">
            <button
              onClick={handleSiguiente}
              disabled={seleccionada === null}
              className={`w-full lg:w-auto lg:px-12 py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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
      </div>
    </DesktopLayout>
  )
}
