'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarSession } from '@/hooks/useDiagnostico'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas } from '@/lib/areas'
import AreaBar from '@/components/AreaBar'
import PDFButton from '@/components/PDFButton'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import type { PerfilKey } from '@/lib/perfiles'
import type { DiagnosticoSession } from '@/hooks/useDiagnostico'

export default function ResultadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Partial<DiagnosticoSession> | null>(null)

  useEffect(() => {
    const s = cargarSession()
    if (!s.perfil || !s.respuestas || !s.datos?.email) {
      router.replace('/')
      return
    }
    setSession(s)
  }, [router])

  if (!session?.perfil || !session?.respuestas) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mc-azul border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const perfil = session.perfil as PerfilKey
  const p = PERFILES[perfil]
  const areas = calcularAreas(session.respuestas)
  const nombre = session.datos
    ? `${session.datos.nombre}${session.datos.apellido ? ' ' + session.datos.apellido : ''}`
    : ''

  const waMsgCorto = p.waMsg.split('. ').pop() ?? ''
  const waText = encodeURIComponent(
    `Hola, hice el diagnóstico en diagnostico.mejoraok.com.\nSoy ${nombre} y mi perfil es ${p.tag}. ${waMsgCorto}`
  )
  const waUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${waText}`

  return (
    <DesktopLayout leftContent={
      <LeftPanel
        step="resultado"
        perfilTag={p.tag}
        perfilRef={p.ref}
      />
    }>
      <div className="min-h-[100dvh]">
        {/* Header — oculto en desktop, el logo está en el panel izquierdo */}
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mejora Continua" className="h-7" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:px-16 lg:py-20">

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

          {/* CTA principal — antes del scroll de áreas */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fba58] text-white font-bold py-4 px-8 rounded-sm text-sm tracking-widest uppercase transition-colors duration-200 mb-8"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {p.cta}
          </a>

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

          {/* Cierre */}
          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-xl sm:text-2xl font-bold text-mc-negro mb-3">
              {p.cierreTitulo}
            </h3>
            <p className="text-base leading-relaxed text-gray-600 mb-6">
              {p.cierreTxt}
            </p>

            <div className="text-center mb-8">
              <PDFButton perfil={perfil} nombre={nombre} areas={areas} />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-mc-gris pt-4 border-t border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-4" />
              <span className="font-bold tracking-widest uppercase">Mejora Continua</span>
            </div>
          </div>
        </div>
      </div>
    </DesktopLayout>
  )
}
