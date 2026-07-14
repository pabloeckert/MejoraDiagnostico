'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { guardarDatos, guardarLead, cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel, getSessionId, getVisitorId } from '@/lib/funnel'
import DesktopLayout from '@/components/DesktopLayout'
import LeftPanel from '@/components/LeftPanel'

const PAISES = [
  { code: '+54',  emoji: '🇦🇷', nombre: 'Argentina' },
  { code: '+595', emoji: '🇵🇾', nombre: 'Paraguay' },
  { code: '+55',  emoji: '🇧🇷', nombre: 'Brasil' },
  { code: '+598', emoji: '🇺🇾', nombre: 'Uruguay' },
  { code: '+56',  emoji: '🇨🇱', nombre: 'Chile' },
  { code: '+591', emoji: '🇧🇴', nombre: 'Bolivia' },
  { code: '+51',  emoji: '🇵🇪', nombre: 'Perú' },
  { code: '+593', emoji: '🇪🇨', nombre: 'Ecuador' },
  { code: '+57',  emoji: '🇨🇴', nombre: 'Colombia' },
  { code: '+58',  emoji: '🇻🇪', nombre: 'Venezuela' },
  { code: '+507', emoji: '🇵🇦', nombre: 'Panamá' },
  { code: '+506', emoji: '🇨🇷', nombre: 'Costa Rica' },
  { code: '+502', emoji: '🇬🇹', nombre: 'Guatemala' },
  { code: '+503', emoji: '🇸🇻', nombre: 'El Salvador' },
  { code: '+504', emoji: '🇭🇳', nombre: 'Honduras' },
  { code: '+505', emoji: '🇳🇮', nombre: 'Nicaragua' },
  { code: '+52',  emoji: '🇲🇽', nombre: 'México' },
  { code: '+1809',emoji: '🇩🇴', nombre: 'R. Dominicana' },
  { code: '+53',  emoji: '🇨🇺', nombre: 'Cuba' },
  { code: '+34',  emoji: '🇪🇸', nombre: 'España' },
  { code: '+1',   emoji: '🇺🇸', nombre: 'EE.UU.' },
]

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-md text-lg lg:text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul transition-colors font-spartan'

export default function DatosPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [codPais, setCodPais] = useState('+54')
  const [wa, setWa] = useState('')
  const [errorWa, setErrorWa] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('mc_diagnostico')
    if (raw) {
      try {
        const s = JSON.parse(raw)
        if (s.nombre) setNombre(s.nombre)
      } catch {}
    }
  }, [])

  useEffect(() => {
    const handler = () => trackFunnel('abandono', { paso: 'formulario' })
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function validate() {
    if (!wa.trim() || !/^\d{8,15}$/.test(wa.replace(/\s/g, ''))) {
      return 'Número inválido'
    }
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setErrorWa(err); return }

    setLoading(true)
    guardarDatos({ nombre, codPais, whatsapp: wa })

    const session = cargarSession()
    const respuestas = session.respuestas ?? []
    const perfil = session.perfil ?? 'SATURADO'
    const total = respuestas.reduce((a, b) => a + b, 0)

    guardarLead({ nombre, whatsapp: `${codPais}${wa}`, perfil, total, respuestas })

    let funnelData: { duplicado?: boolean } = { duplicado: false }
    try {
      const funnelRes = await fetch('/api/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          visitor_id: getVisitorId(),
          evento: 'formulario_completado',
          timestamp: new Date().toISOString(),
          whatsapp: codPais + wa,
          perfil,
        }),
      })
      funnelData = await funnelRes.json()
    } catch {
      // continuar aunque falle el tracking del funnel
    }

    if (!funnelData.duplicado) {
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            apellido: '',
            empresa: '',
            whatsapp: wa,
            codPais,
            perfil,
            respuestas,
            honeypot: '',
            consent: true,
          }),
        })
      } catch {
        // continuar aunque falle el email
      }

      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            whatsapp: wa,
            codPais,
            perfil,
          }),
        })
      } catch (e) {
        console.error('Telegram notify error:', e)
      }
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
          <h1 className="text-4xl sm:text-5xl font-bold text-mc-negro mb-3">
            {nombre}.
          </h1>
          <p className="text-mc-gris text-xl mb-1">Tu diagnóstico está listo.</p>
          <p className="text-base text-gray-700 lg:text-mc-gris mb-8">¿A dónde te avisamos?</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <div className="flex gap-2">
                <div className="relative" style={{ width: '110px', flexShrink: 0 }}>
                  <select
                    value={codPais}
                    onChange={e => setCodPais(e.target.value)}
                    className="w-full min-h-[48px] pl-3 pr-7 py-3 border border-gray-200 rounded-md text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul transition-colors font-spartan appearance-none"
                  >
                    {PAISES.map(p => (
                      <option key={p.code + p.nombre} value={p.code}>
                        {p.emoji} {p.code}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1L6 7L11 1" stroke="#656565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <input
                  type="tel"
                  value={wa}
                  onChange={e => { setWa(e.target.value); setErrorWa('') }}
                  placeholder="Sin 0 ni 15"
                  className={`${inputCls} flex-1`}
                />
              </div>
              {errorWa && <p className="text-mc-rojo text-xs mt-1">{errorWa}</p>}
            </div>

            <input type="text" name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />

            <button
              type="submit"
              disabled={loading}
              className={`w-full lg:w-auto lg:px-12 min-h-[56px] lg:min-h-[52px] py-4 text-base lg:text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
                loading
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
              }`}
            >
              {loading ? 'PROCESANDO...' : 'VER MI DIAGNÓSTICO →'}
            </button>

            <p className="text-sm text-gray-600 lg:text-xs lg:text-gray-200 text-center mt-8">
              <a href="/privacidad" className="hover:text-gray-400 transition-colors">
                política de privacidad
              </a>
            </p>
          </form>
        </div>
      </div>
    </DesktopLayout>
  )
}
