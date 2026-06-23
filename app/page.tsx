'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function Home() {
  const router = useRouter()
  const [momento, setMomento] = useState<1 | 2>(1)
  const [saliendo, setSaliendo] = useState(false)

  function handleSeguir() {
    setSaliendo(true)
    setTimeout(() => setMomento(2), 250)
  }

  return (
    <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
      {/* Mobile — 2 momentos secuenciales (replican panel izq/der del desktop) */}
      <div className="lg:hidden">
        {momento === 1 ? (
          <div
            className="min-h-[100dvh] bg-mc-azul flex flex-col justify-between px-6 py-8"
            style={{ animation: saliendo ? 'slideOutLeft 0.25s ease forwards' : 'fadeUp 0.5s ease forwards' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-blanco.png" alt="Mejora Continua" className="h-8 object-contain" loading="eager" decoding="async" />

            <p className="text-4xl font-bold text-white leading-tight max-w-xs">
              Descubrí dónde está tu negocio hoy.
            </p>

            <button
              onClick={handleSeguir}
              className="w-full min-h-[56px] bg-white text-mc-azul-marino font-bold py-4 rounded-sm text-sm tracking-widest uppercase"
            >
              SEGUIR →
            </button>
          </div>
        ) : (
          <div
            className="min-h-[100dvh] bg-white flex flex-col justify-center px-6 py-8"
            style={{ animation: 'slideInRight 0.35s ease forwards' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="Mejora Continua" className="h-8 object-contain mx-auto mb-8" loading="eager" decoding="async" />

            <p className="text-2xl font-bold text-mc-negro leading-tight text-center mb-4">
              Descubrí dónde está tu negocio hoy.
            </p>

            <span className="text-xs font-semibold tracking-widest uppercase text-gray-500 mx-auto mb-8">
              MENOS DE 1 MINUTO
            </span>

            <button
              onClick={() => router.push('/diagnostico')}
              className="w-full min-h-[56px] bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-4 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200"
            >
              DESCUBRIR MI PERFIL →
            </button>
          </div>
        )}
      </div>

      {/* Desktop — pantalla única existente */}
      <div className="hidden lg:flex lg:flex-col items-center justify-center min-h-[100dvh] px-6 py-12 lg:px-16">
        <p className="text-mc-gris text-center text-lg mb-6 max-w-sm">
          Descubrí dónde está tu negocio hoy.
        </p>

        <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full mb-10">
          MENOS DE 1 MINUTO
        </span>

        <button
          onClick={() => router.push('/diagnostico')}
          className="w-full max-w-xs lg:w-auto lg:px-12 min-h-[52px] bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-4 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200"
        >
          DESCUBRIR MI PERFIL →
        </button>

      </div>
    </DesktopLayout>
  )
}
