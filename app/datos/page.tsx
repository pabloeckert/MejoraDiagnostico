'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { guardarDatos, guardarLead, cargarSession } from '@/hooks/useDiagnostico'
import { trackFunnel } from '@/lib/funnel'
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

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-md text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul transition-colors font-spartan'
const labelCls = 'block text-xs font-bold text-mc-gris uppercase tracking-widest mb-2'

export default function DatosPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [codPais, setCodPais] = useState('+54')
  const [wa, setWa] = useState('')
  const [errorWa, setErrorWa] = useState('')
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState(false)

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
    if (!wa.trim() || !/^\d{6,15}$/.test(wa.replace(/\s/g, ''))) {
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
    const perfil = session.perfil ?? 'EMPRENDEDOR_SATURADO'
    const total = respuestas.reduce((a, b) => a + b, 0)

    guardarLead({ nombre, whatsapp: `${codPais}${wa}`, perfil, total, respuestas })

    trackFunnel('formulario_completado', { whatsapp: codPais + wa, perfil })

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

    router.replace('/resultado')
  }

  return (
    <DesktopLayout leftContent={<LeftPanel step="datos" />}>
      <div className="min-h-[100dvh]">
        {/* Header — oculto en desktop */}
        <div className="flex items-center justify-center py-6 border-b border-gray-100 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mejora Continua" className="h-10" />
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:px-16 lg:py-20">
          <p className="text-xs font-bold tracking-widest text-mc-azul uppercase mb-2">ÚLTIMO PASO</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-2">Ya tenemos tu perfil.</h1>
          {nombre && (
            <p className="text-mc-gris text-sm mb-6">Hola, {nombre} 👋</p>
          )}
          <p className="text-mc-gris text-base mb-8">¿A qué WhatsApp te lo enviamos?</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* WhatsApp */}
            <div>
              <label className={labelCls}>
                WhatsApp <span className="text-mc-rojo">*</span>
              </label>
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

            {/* Consentimiento */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 cursor-pointer"
                style={{ accentColor: '#1C4D8C' }}
              />
              <span className="text-sm text-mc-gris leading-relaxed">
                Acepto el tratamiento de mis datos según la{' '}
                <a href="/privacidad" className="text-mc-azul underline">
                  política de privacidad
                </a>
              </span>
              <input type="text" name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />
            </div>

            <button
              type="submit"
              disabled={loading || !consent}
              className={`w-full lg:w-auto lg:px-12 min-h-[52px] py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
                loading || !consent
                  ? 'bg-mc-gris-claro text-mc-gris cursor-not-allowed'
                  : 'bg-mc-azul hover:bg-mc-azul-marino text-white'
              }`}
            >
              {loading ? 'PROCESANDO...' : 'VER MI DIAGNÓSTICO →'}
            </button>
          </form>
        </div>
      </div>
    </DesktopLayout>
  )
}
