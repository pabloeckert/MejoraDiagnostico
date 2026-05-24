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
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mc-azul border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const tieneEmail = !!session.datos?.email
  const perfil = session.perfil as PerfilKey
  const p = PERFILES[perfil]
  const areas = calcularAreas(session.respuestas)
  const total = session.respuestas.reduce((a, b) => a + b, 0)
  const pctTotal = Math.round((total / 32) * 100)
  const nombre = session.datos
    ? `${session.datos.nombre}${session.datos.apellido ? ' ' + session.datos.apellido : ''}`
    : ''

  const waText = encodeURIComponent(p.waMsg)
  const waUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${waText}`

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="w-full max-w-[680px] mx-auto">

        {/* Badge + perfil */}
        <div className="mb-8">
          <span
            className="inline-block text-mc-azul text-xs font-spartan font-700 tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ border: '1.5px solid #1C4D8C' }}
          >
            Tu Perfil
          </span>
          <h1 className="text-3xl sm:text-4xl font-spartan font-700 text-mc-negro leading-tight mb-2">
            {p.tag}
          </h1>
          <p className="text-mc-azul font-spartan font-700 text-sm tracking-widest uppercase">
            {p.ref}
          </p>
        </div>

        {/* Puntaje total */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl font-spartan font-700 text-mc-negro">{pctTotal}%</span>
          <span className="text-mc-gris font-spartan text-sm">puntaje global ({total}/32)</span>
        </div>

        {/* Descripción */}
        <p className="text-gray-700 font-spartan font-400 text-base leading-relaxed mb-6">
          {p.desc}
        </p>

        {/* Verdad central */}
        <div className="bg-mc-gris-claro border-l-4 border-mc-azul px-5 py-4 mb-10 rounded-r-sm">
          <p className="text-xs font-spartan font-700 text-mc-azul uppercase tracking-widest mb-1">
            La verdad central
          </p>
          <p className="text-gray-800 font-spartan font-600 text-base">
            {p.verdad}
          </p>
        </div>

        {/* Áreas */}
        <div className="mb-10">
          <h2 className="text-sm font-spartan font-700 text-mc-negro uppercase tracking-widest mb-6">
            Tu diagnóstico por área
          </h2>
          {areas.map((area, i) => (
            <AreaBar
              key={area.nombre}
              nombre={area.nombre}
              porcentaje={area.porcentaje}
              delay={i * 150}
            />
          ))}
        </div>

        {/* Teaser (sin datos) o completo (con datos) */}
        {!tieneEmail ? (
          <div style={{ position: 'relative' }}>
            {/* Contenido fantasma visible bajo el overlay */}
            <div className="bg-mc-gris-claro rounded-sm px-6 py-6 mb-8">
              <h3 className="font-spartan font-700 text-mc-negro text-base uppercase tracking-wide mb-2">
                {p.cierreTitulo}
              </h3>
              <p className="text-mc-gris font-spartan text-sm leading-relaxed">
                {p.cierreTxt}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-2">
              <div className="w-full sm:flex-1 h-12 bg-[#25D366] rounded-sm opacity-30" />
              <div className="w-32 h-12 bg-mc-gris-claro rounded-sm opacity-30" />
            </div>

            {/* Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.97) 40%, rgba(255,255,255,1) 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                padding: '32px',
                textAlign: 'center',
                zIndex: 10,
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '32px', lineHeight: 1 }}>🔒</span>
              <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#0D0D0D', margin: 0 }}>
                Tu plan de acción completo está listo
              </p>
              <p style={{ fontSize: '16px', color: '#656565', margin: 0, maxWidth: '400px' }}>
                Ingresá tus datos para desbloquearlo y recibirlo por email
              </p>
              <button
                onClick={() => router.push('/datos')}
                style={{
                  background: '#1C4D8C',
                  color: 'white',
                  padding: '16px 32px',
                  fontWeight: 700,
                  fontSize: '15px',
                  letterSpacing: '0.08em',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '360px',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  marginTop: '8px',
                }}
              >
                DESBLOQUEAR MI DIAGNÓSTICO →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Cierre */}
            <div className="bg-mc-gris-claro rounded-sm px-6 py-6 mb-8">
              <h3 className="font-spartan font-700 text-mc-negro text-base uppercase tracking-wide mb-2">
                {p.cierreTitulo}
              </h3>
              <p className="text-mc-gris font-spartan text-sm leading-relaxed">
                {p.cierreTxt}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full sm:w-auto flex-1 text-center py-4 px-8
                  bg-[#25D366] hover:bg-[#1fba58]
                  text-white font-spartan font-700 text-sm tracking-[0.1em] uppercase
                  rounded-sm transition-colors duration-200
                "
              >
                💬 {p.cta}
              </a>
              <div className="flex items-center justify-center">
                <PDFButton perfil={perfil} nombre={nombre} areas={areas} />
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 font-spartan mt-12">
          Mejora Continua · diagnostico.mejoraok.com
        </p>
      </div>
    </main>
  )
}
