'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarDatos, guardarLead, cargarSession } from '@/hooks/useDiagnostico'
import type { DatosContacto } from '@/hooks/useDiagnostico'

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
  const [form, setForm] = useState<DatosContacto>({
    nombre: '', apellido: '', empresa: '', codPais: '+54', whatsapp: '', email: ''
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DatosContacto, string>>>({})
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState(false)

  function set(k: keyof DatosContacto, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  function validate() {
    const e: typeof errors = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (!form.whatsapp.trim() || !/^\d{6,15}$/.test(form.whatsapp.replace(/\s/g, ''))) e.whatsapp = 'Número inválido'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    guardarDatos(form)

    const session = cargarSession()
    const respuestas = session.respuestas ?? []
    const perfil = session.perfil ?? 'EMPRENDEDOR_SATURADO'
    const total = respuestas.reduce((a, b) => a + b, 0)

    guardarLead({
      nombre: form.nombre, apellido: form.apellido, empresa: form.empresa,
      whatsapp: `${form.codPais}${form.whatsapp}`, email: form.email,
      perfil, total, respuestas
    })

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          empresa: form.empresa,
          email: form.email,
          whatsapp: form.whatsapp,
          codPais: form.codPais,
          perfil,
          respuestas,
          honeypot: '',
          consent: true,
        })
      })
    } catch {
      // continuar aunque falle el email
    }

    router.replace('/resultado')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-center py-6 border-b border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mejora Continua" className="h-7" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <p className="text-xs font-bold tracking-widest text-mc-azul uppercase mb-2">CASI LISTO</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-2">UN PASO MÁS</h1>
        <p className="text-mc-gris text-base mb-8">
          Tu plan de acción completo llega a tu email en segundos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nombre */}
          <div>
            <label className={labelCls}>
              Nombre <span className="text-mc-rojo">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              className={inputCls}
            />
            {errors.nombre && <p className="text-mc-rojo text-xs mt-1">{errors.nombre}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label className={labelCls}>
              WhatsApp <span className="text-mc-rojo">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={form.codPais}
                onChange={e => set('codPais', e.target.value)}
                className="px-3 py-3 border border-gray-200 rounded-md text-base text-mc-negro bg-white focus:outline-none focus:border-mc-azul transition-colors font-spartan"
                style={{ width: '110px', flexShrink: 0 }}
              >
                {PAISES.map(p => (
                  <option key={p.code + p.nombre} value={p.code}>
                    {p.emoji} {p.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                placeholder="Sin 0 ni 15"
                className={`${inputCls} flex-1`}
              />
            </div>
            {errors.whatsapp && <p className="text-mc-rojo text-xs mt-1">{errors.whatsapp}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>
              Email <span className="text-mc-rojo">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="tu@email.com"
              className={inputCls}
            />
            {errors.email && <p className="text-mc-rojo text-xs mt-1">{errors.email}</p>}
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
            className={`w-full py-4 text-sm font-bold tracking-widest uppercase rounded-sm transition-colors duration-200 ${
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
  )
}
