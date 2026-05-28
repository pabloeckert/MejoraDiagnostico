'use client'
import { useRouter } from 'next/navigation'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

export default function Home() {
  const router = useRouter()

  return (
    <DesktopLayout leftContent={<LeftPanel step="inicio" />}>
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 lg:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mejora Continua" className="h-12 sm:h-14 mb-8 lg:hidden" />

        <h1 className="text-4xl sm:text-5xl font-bold text-mc-negro text-center uppercase tracking-tight leading-none mb-4">
          Diagnóstico<br />Empresarial
        </h1>

        <p className="text-mc-gris text-center text-lg mb-6 max-w-sm">
          8 preguntas. Tu perfil real.<br />Lo que nadie te dice de tu negocio.
        </p>

        <span className="border border-mc-negro text-mc-negro text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-10">
          Menos de 1 minuto
        </span>

        <button
          onClick={() => router.push('/diagnostico')}
          className="w-full max-w-xs lg:w-auto lg:px-12 bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-4 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200"
        >
          EMPEZAR →
        </button>

        <div className="flex gap-6 mt-8 text-xs text-mc-gris">
          <span>✓ Gratis</span>
          <span>✓ Sin spam</span>
          <span>✓ Resultado inmediato</span>
        </div>
      </div>
    </DesktopLayout>
  )
}
