'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  guardarDatos,
  guardarLead,
  guardarPerfil,
  guardarScores,
  cargarSession,
  cargarPregunta0,
} from '@/hooks/useDiagnostico'
import { trackFunnel, getSessionId, getVisitorId, getContextoLanding } from '@/lib/funnel'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'
import type { PerfilKey } from '@/lib/perfiles'

const PAISES = [
  { code: '+54', emoji: '🇦🇷', nombre: 'Argentina' },
  { code: '+595', emoji: '🇵🇾', nombre: 'Paraguay' },
  { code: '+55', emoji: '🇧🇷', nombre: 'Brasil' },
  { code: '+598', emoji: '🇺🇾', nombre: 'Uruguay' },
  { code: '+56', emoji: '🇨🇱', nombre: 'Chile' },
  { code: '+591', emoji: '🇧🇴', nombre: 'Bolivia' },
  { code: '+51', emoji: '🇵🇪', nombre: 'Perú' },
  { code: '+593', emoji: '🇪🇨', nombre: 'Ecuador' },
  { code: '+57', emoji: '🇨🇴', nombre: 'Colombia' },
  { code: '+58', emoji: '🇻🇪', nombre: 'Venezuela' },
  { code: '+507', emoji: '🇵🇦', nombre: 'Panamá' },
  { code: '+506', emoji: '🇨🇷', nombre: 'Costa Rica' },
  { code: '+502', emoji: '🇬🇹', nombre: 'Guatemala' },
  { code: '+503', emoji: '🇸🇻', nombre: 'El Salvador' },
  { code: '+504', emoji: '🇭🇳', nombre: 'Honduras' },
  { code: '+505', emoji: '🇳🇮', nombre: 'Nicaragua' },
  { code: '+52', emoji: '🇲🇽', nombre: 'México' },
  { code: '+1809', emoji: '🇩🇴', nombre: 'R. Dominicana' },
  { code: '+53', emoji: '🇨🇺', nombre: 'Cuba' },
  { code: '+34', emoji: '🇪🇸', nombre: 'España' },
  { code: '+1', emoji: '🇺🇸', nombre: 'EE.UU.' },
]

const inputCls =
  'w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-md text-lg lg:text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul focus:ring-2 focus:ring-mc-azul/20 transition-colors font-spartan'

export default function DatosPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [codPais, setCodPais] = useState('+54')
  const [wa, setWa] = useState('')
  const [errorNombre, setErrorNombre] = useState('')
  const [errorWa, setErrorWa] = useState('')
  const [errorSubmit, setErrorSubmit] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const s = cargarSession()
    if (!Array.isArray(s.respuestas) || s.respuestas.length !== 8 || s.respuestas.some((v) => v < 1)) {
      router.replace('/diagnostico')
      return
    }
    if (s.nombre) setNombre(s.nombre)
  }, [router])

  useEffect(() => {
    const handler = () => trackFunnel('abandono', { paso: 'formulario' })
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function validate(): boolean {
    let valid = true
    if (nombre.trim().length < 2) {
      setErrorNombre('Ingresá tu nombre para personalizar tu diagnóstico.')
      valid = false
    }
    const cleanWa = wa.replace(/\s+/g, '')
    if (!cleanWa || !/^\d{8,15}$/.test(cleanWa)) {
      setErrorWa('Ingresá un número válido de WhatsApp (8 a 15 dígitos, sin 0 ni 15).')
      valid = false
    }
    return valid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || loading) return

    setLoading(true)
    setErrorSubmit('')

    const nombreLimpio = nombre.trim()
    const waLimpio = wa.replace(/\s+/g, '')
    const session = cargarSession()
    const pregunta0 = session.pregunta0 || cargarPregunta0()
    const respuestas = session.respuestas ?? []
    const tiempos = session.tiempos ?? []
    const perfil = (session.perfil ?? 'SATURADO') as PerfilKey
    const total = respuestas.reduce((a, b) => a + b, 0)
    const ctx = getContextoLanding()

    guardarDatos({ nombre: nombreLimpio, codPais, whatsapp: waLimpio })
    guardarLead({
      nombre: nombreLimpio,
      whatsapp: `${codPais}${waLimpio}`,
      perfil,
      total,
      respuestas,
    })

    try {
      const res = await fetch('/api/diagnostico/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          visitorId: getVisitorId(),
          nombre: nombreLimpio,
          codPais,
          whatsapp: waLimpio,
          respuestas,
          posicion: session.posicion,
          tiempos,
          pregunta0,
          utmSource: ctx.utm_source,
          utmMedium: ctx.utm_medium,
          utmCampaign: ctx.utm_campaign,
          utmContent: ctx.utm_content,
          refContacto: ctx.ref_contacto,
          honeypot: '',
          consent: true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.perfil) guardarPerfil(data.perfil as PerfilKey)
        if (data.scores) guardarScores(data.scores)
      }
    } catch {
      // Mantiene datos en sesión local para mostrar el resultado al empresario sin bloquearlo
    }

    router.replace('/resultado')
  }

  return (
    <DesktopLayout leftContent={<LeftPanel step="datos" />}>
      <div className="min-h-[100dvh]">
        <div className="flex items-center justify-start pl-6 py-4 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Mejora Continua" className="h-10 object-contain" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:px-16 lg:py-20">
          <div className="mb-3">
            <span className="text-[11px] font-bold tracking-widest uppercase text-mc-azul bg-mc-azul/10 px-3 py-1 rounded-full">
              ÚLTIMO PASO · RESULTADO LISTO
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-mc-negro mb-3 leading-tight">
            Tu radiografía 4D ya está calculada.
          </h1>
          <p className="text-base sm:text-lg text-mc-gris mb-8">
            Decinos cómo te llamás y a qué WhatsApp te enviamos tu reporte personalizado y Plan de 72h:
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="mc-nombre" className="block text-xs font-bold uppercase tracking-wider text-mc-tinta mb-1.5">
                Tu nombre
              </label>
              <input
                id="mc-nombre"
                type="text"
                autoFocus
                autoCapitalize="words"
                autoComplete="given-name"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  setErrorNombre('')
                }}
                placeholder="Ej: Martín o Laura"
                className={inputCls}
              />
              {errorNombre && <p className="text-mc-rojo text-xs mt-1 font-medium">{errorNombre}</p>}
            </div>

            <div>
              <label htmlFor="mc-whatsapp" className="block text-xs font-bold uppercase tracking-wider text-mc-tinta mb-1.5">
                WhatsApp
              </label>
              <div className="flex gap-2">
                <div className="relative" style={{ width: '115px', flexShrink: 0 }}>
                  <select
                    aria-label="Código de país"
                    value={codPais}
                    onChange={(e) => setCodPais(e.target.value)}
                    className="w-full min-h-[48px] pl-3 pr-7 py-3 border border-gray-300 rounded-md text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul transition-colors font-spartan appearance-none"
                  >
                    {PAISES.map((p) => (
                      <option key={p.code + p.nombre} value={p.code}>
                        {p.emoji} {p.code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path
                        d="M1 1L6 7L11 1"
                        stroke="#656565"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <input
                  id="mc-whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={wa}
                  onChange={(e) => {
                    setWa(e.target.value)
                    setErrorWa('')
                  }}
                  placeholder="Sin 0 ni 15"
                  className={`${inputCls} flex-1`}
                />
              </div>
              {errorWa && <p className="text-mc-rojo text-xs mt-1 font-medium">{errorWa}</p>}
            </div>

            <input type="text" name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />

            {errorSubmit && <p className="text-mc-rojo text-sm font-medium">{errorSubmit}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full lg:w-auto lg:px-12 min-h-[56px] lg:min-h-[52px] py-4 text-base lg:text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed opacity-70'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white cursor-pointer'
              }`}
            >
              {loading ? 'GENERANDO TU REPORTE...' : 'VER MI DIAGNÓSTICO →'}
            </button>

            <p className="text-sm text-gray-600 lg:text-xs lg:text-gray-500 text-center mt-4">
              Sin spam ni costos ocultos ·{' '}
              <a href="/privacidad" className="underline hover:text-mc-azul transition-colors">
                política de privacidad
              </a>
            </p>
          </form>
        </div>
      </div>
    </DesktopLayout>
  )
}
