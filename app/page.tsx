'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function Logo() {
  return (
    <div className="flex items-center gap-3 justify-center mb-10">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,4 36,34 4,34" fill="#1C4D8C" />
        <polygon points="28,18 36,32 20,32" fill="#D9072D" opacity="0.9" />
        <circle cx="9" cy="31" r="4" fill="#F2BB16" />
        <line x1="6" y1="38" x2="34" y2="38" stroke="#656565" strokeWidth="1.5" />
        <polygon points="34,36 38,38 34,40" fill="#656565" />
      </svg>
      <span className="text-white font-spartan font-700 text-xl tracking-wide">
        Mejora Continua
      </span>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen bg-mc-negro flex flex-col items-center justify-center px-4 py-16">
      <div
        className={`w-full max-w-[480px] text-center transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <Logo />

        <div className="inline-block bg-mc-azul/20 border border-mc-azul/40 text-mc-azul text-xs font-spartan font-600 tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
          Menos de 1 minuto
        </div>

        <h1 className="text-4xl sm:text-5xl font-spartan font-700 text-white leading-tight mb-4 tracking-tight">
          DIAGNÓSTICO<br />EMPRESARIAL
        </h1>

        <p className="text-mc-gris font-spartan font-300 text-lg mb-12 leading-relaxed">
          8 preguntas. Tu perfil real.<br />
          Lo que nadie te dice de tu negocio.
        </p>

        <button
          onClick={() => router.push('/diagnostico')}
          className="
            w-full sm:w-auto px-12 py-4 bg-mc-azul hover:bg-mc-azul-marino
            text-white font-spartan font-700 text-base tracking-[0.1em] uppercase
            rounded-sm transition-colors duration-200
          "
        >
          EMPEZAR →
        </button>
      </div>
    </main>
  )
}
