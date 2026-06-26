'use client'
import { useRouter } from 'next/navigation'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function Home() {
  const router = useRouter()

  return (
    <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
      {/* Mobile — Momento 1 directo a /diagnostico */}
      <div className="lg:hidden">
        <div
          className="h-[100dvh] bg-mc-azul flex flex-col justify-between px-6 py-10"
          style={{ animation: 'fadeUp 0.5s ease forwards' }}
        >
          <div className="flex-1 flex items-center">
            <p className="text-5xl font-bold text-white leading-tight">
              Descubrí dónde está tu negocio hoy.
            </p>
          </div>

          <button
            onClick={() => router.push('/diagnostico')}
            className="w-full min-h-[56px] bg-white text-mc-azul font-bold py-4 rounded-sm text-base tracking-widest uppercase"
          >
            SEGUIR →
          </button>
        </div>
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
