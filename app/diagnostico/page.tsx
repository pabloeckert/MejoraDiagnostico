'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PREGUNTAS } from '@/lib/preguntas'
import { detectarPerfil } from '@/lib/detectar'
import { guardarRespuestas, guardarPerfil } from '@/hooks/useDiagnostico'
import ProgressBar from '@/components/ProgressBar'
import QuestionCard from '@/components/QuestionCard'

export default function DiagnosticoPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [respuestas, setRespuestas] = useState<number[]>(Array(8).fill(0))
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mc_diagnostico')
    }
  }, [])

  useEffect(() => {
    setSeleccionada(null)
  }, [step])

  const pregunta = PREGUNTAS[step]

  function handleSelect(valor: number) {
    setSeleccionada(valor)
  }

  function handleSiguiente() {
    if (seleccionada === null) return
    const nuevas = [...respuestas]
    nuevas[step] = seleccionada
    setRespuestas(nuevas)

    if (step < PREGUNTAS.length - 1) {
      setFade(false)
      setTimeout(() => {
        setStep(step + 1)
        setFade(true)
      }, 200)
    } else {
      guardarRespuestas(nuevas)
      const perfil = detectarPerfil(nuevas)
      guardarPerfil(perfil)
      router.replace('/datos')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center py-6 border-b border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mejora Continua" className="h-7" />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col">
        <ProgressBar current={step + 1} total={PREGUNTAS.length} />

        <div className={`flex-1 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
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
            className={`w-full py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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
  )
}
