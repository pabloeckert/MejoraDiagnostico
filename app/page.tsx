'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div
        className={`w-full max-w-[480px] text-center transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Logo real */}
        <div className="flex justify-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Mejora Continua"
            style={{ width: '200px', height: 'auto' }}
          />
        </div>

        {/* Badge */}
        <div
          className="inline-block text-mc-negro text-xs font-spartan font-700 tracking-[0.1em] uppercase px-[18px] py-[6px] rounded-full mb-8"
          style={{ border: '1.5px solid #0D0D0D' }}
        >
          Menos de 1 minuto
        </div>

        {/* Título */}
        <h1
          className="font-spartan font-700 text-mc-negro uppercase leading-tight mb-4"
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            letterSpacing: '-0.02em',
          }}
        >
          DIAGNÓSTICO<br />EMPRESARIAL
        </h1>

        {/* Subtítulo */}
        <p className="text-mc-gris font-spartan font-300 mb-12 leading-relaxed" style={{ fontSize: '18px' }}>
          8 preguntas. Tu perfil real.<br />
          Lo que nadie te dice de tu negocio.
        </p>

        {/* Botón */}
        <button
          onClick={() => router.push('/diagnostico')}
          className="
            w-full sm:w-auto bg-mc-azul hover:bg-mc-azul-marino
            text-white font-spartan font-700 uppercase
            transition-colors duration-200
          "
          style={{
            borderRadius: '3px',
            padding: '18px 48px',
            letterSpacing: '0.08em',
          }}
        >
          EMPEZAR →
        </button>
      </div>
    </main>
  )
}
