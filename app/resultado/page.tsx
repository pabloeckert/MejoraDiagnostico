'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas } from '@/lib/areas'
import AreaBar from '@/components/AreaBar'
import PDFButton from '@/components/PDFButton'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession } from '@/hooks/useDiagnostico'

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)

  useEffect(() => {
    const s = cargarSession()
    if (!s.perfil || !s.respuestas) {
      router.replace('/')
      return
    }
    setSession(s)
  }, [router])

  if (!session?.perfil || !session?.respuestas) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mc-azul border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const tieneEmail = !!session.datos?.email
  const perfil = session.perfil as PerfilKey
  const p = PERFILES[perfil]
  const areas = calcularAreas(session.respuestas)
  const nombre = session.datos
    ? `${session.datos.nombre}${session.datos.apellido ? ' ' + session.datos.apellido : ''}`
    : ''

  const waText = encodeURIComponent(p.waMsg)
  const waUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${waText}`

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-center py-6 border-b border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mejora Continua" className="h-7" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Badge */}
        <div className="mb-4">
          <span className="inline-block border border-mc-azul text-mc-azul text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full">
            TU PERFIL
          </span>
        </div>

        {/* Perfil */}
        <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-2">
          {p.tag}
        </h1>
        <p className="text-mc-azul font-bold text-xs tracking-widest uppercase mb-6">
          {p.ref}
        </p>

        {/* Descripción */}
        <p className="text-base leading-relaxed text-gray-700 mb-6">
          {p.desc}
        </p>

        {/* Verdad central */}
        <div className="bg-mc-gris-claro border-l-4 border-mc-azul px-5 py-4 mb-8 rounded-r-sm">
          <p className="text-xs font-bold text-mc-azul uppercase tracking-widest mb-2">
            La verdad central
          </p>
          <p className="text-mc-negro font-semibold leading-snug">
            {p.verdad}
          </p>
        </div>

        {/* Áreas */}
        <div className="mb-8">
          <p className="text-xs font-bold text-mc-gris uppercase tracking-widest mb-4">
            Tu diagnóstico por área
          </p>
          {areas.map((area, i) => (
            <AreaBar
              key={area.nombre}
              nombre={area.nombre}
              porcentaje={area.porcentaje}
              delay={i * 150}
            />
          ))}
        </div>

        {/* Teaser / Completo */}
        {!tieneEmail ? (
          <div className="mt-12 relative min-h-[320px]">
            {/* Contenido fantasma — borroso */}
            <div className="filter blur-sm pointer-events-none select-none opacity-40">
              <div className="h-6 bg-mc-gris-claro rounded mb-3 w-3/4" />
              <div className="h-4 bg-mc-gris-claro rounded mb-2 w-full" />
              <div className="h-4 bg-mc-gris-claro rounded mb-2 w-5/6" />
              <div className="h-12 bg-mc-azul rounded mt-6 opacity-30" />
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-xl sm:text-2xl font-bold text-mc-negro mb-2">
                Tu plan de acción está listo
              </p>
              <p className="text-mc-gris mb-6 max-w-sm">
                Ingresá tus datos para desbloquearlo y recibirlo por email
              </p>
              <button
                onClick={() => router.replace('/datos')}
                className="w-full max-w-xs bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-4 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200"
              >
                DESBLOQUEAR →
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-xl sm:text-2xl font-bold text-mc-negro mb-3">
              {p.cierreTitulo}
            </h3>
            <p className="text-base leading-relaxed text-gray-600 mb-6">
              {p.cierreTxt}
            </p>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fba58] text-white font-bold py-4 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200 mb-3"
            >
              💬 {p.cta}
            </a>

            <div className="text-center mb-8">
              <PDFButton perfil={perfil} nombre={nombre} areas={areas} />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-mc-gris pt-4 border-t border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-4" />
              <span className="font-bold tracking-widest uppercase">Mejora Continua</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
