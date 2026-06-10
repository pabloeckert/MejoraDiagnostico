'use client'
import { useRouter } from 'next/navigation'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function Home() {
  const router = useRouter()

  return (
    <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12 lg:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="Mejora Continua" className="h-12 sm:h-14 mb-8 lg:hidden object-contain" loading="eager" decoding="async" />

        <p className="text-mc-gris text-center text-lg mb-6 max-w-sm">
          Lo que tu negocio no te está diciendo.
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
