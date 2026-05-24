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
  const [saliendo, setSaliendo] = useState(false)

  const pregunta = PREGUNTAS[step]

  useEffect(() => {
    setSeleccionada(null)
  }, [step])

  function handleSelect(valor: number) {
    setSeleccionada(valor)
  }

  function handleSiguiente() {
    if (seleccionada === null) return
    const nuevas = [...respuestas]
    nuevas[step] = seleccionada
    setRespuestas(nuevas)

    if (step < PREGUNTAS.length - 1) {
      setSaliendo(true)
      setTimeout(() => {
        setStep(step + 1)
        setSaliendo(false)
      }, 150)
    } else {
      guardarRespuestas(nuevas)
      const perfil = detectarPerfil(nuevas)
      guardarPerfil(perfil)
      router.push('/datos')
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col px-4 py-10">
      <div className="w-full max-w-[640px] mx-auto flex flex-col flex-1">
        <ProgressBar current={step + 1} total={PREGUNTAS.length} />

        <div
          className={`flex-1 transition-all duration-150 ${
            saliendo ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <QuestionCard
            texto={pregunta.texto}
            numero={step + 1}
            opciones={pregunta.opciones}
            seleccionada={seleccionada}
            onSelect={handleSelect}
          />
        </div>

        <div className="mt-10">
          <button
            onClick={handleSiguiente}
            disabled={seleccionada === null}
            className="
              w-full py-4 bg-mc-azul hover:bg-mc-azul-marino
              text-white font-spartan font-700 text-sm tracking-[0.1em] uppercase
              rounded-sm transition-colors duration-200
              disabled:opacity-30 disabled:cursor-not-allowed
            "
          >
            {step < PREGUNTAS.length - 1 ? 'SIGUIENTE →' : 'VER MI DIAGNÓSTICO →'}
          </button>
        </div>
      </div>
    </main>
  )
}
