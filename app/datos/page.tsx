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

function InputField({
  label, value, onChange, type = 'text', required = false, placeholder = ''
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-spartan font-600 text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-mc-rojo ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="
          w-full px-4 py-3 border border-gray-200 rounded-sm
          font-spartan font-400 text-gray-900 text-base
          focus:outline-none focus:border-mc-azul transition-colors
        "
      />
    </div>
  )
}

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
          email: form.email,
          whatsapp: `${form.codPais}${form.whatsapp}`,
          perfil,
          honeypot: '',
          consent: true,
          adminPayload: JSON.stringify({ form, perfil, total, respuestas }),
          prospectoPayload: JSON.stringify({ form, perfil, total, respuestas }),
        })
      })
    } catch {
      // continuar aunque falle el email
    }

    router.push('/resultado')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-[540px]">
        <p className="text-xs font-spartan font-600 tracking-widest text-mc-azul uppercase mb-2">
          Casi listo
        </p>
        <h1 className="text-3xl font-spartan font-700 text-mc-negro mb-2 leading-tight">
          ¿A quién le enviamos el resultado?
        </h1>
        <p className="text-mc-gris font-spartan text-base mb-8">
          Completá tus datos para ver tu diagnóstico.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputField label="Nombre" value={form.nombre} onChange={v => set('nombre', v)} required />
              {errors.nombre && <p className="text-mc-rojo text-xs mt-1">{errors.nombre}</p>}
            </div>
            <InputField label="Apellido" value={form.apellido} onChange={v => set('apellido', v)} />
          </div>

          <InputField label="Empresa / Negocio" value={form.empresa} onChange={v => set('empresa', v)} placeholder="Opcional" />

          <div>
            <label className="text-xs font-spartan font-600 text-gray-500 uppercase tracking-wider block mb-1">
              WhatsApp<span className="text-mc-rojo ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={form.codPais}
                onChange={e => set('codPais', e.target.value)}
                className="px-2 py-3 border border-gray-200 rounded-sm font-spartan text-sm focus:outline-none focus:border-mc-azul bg-white"
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
                className="flex-1 px-4 py-3 border border-gray-200 rounded-sm font-spartan text-base focus:outline-none focus:border-mc-azul"
              />
            </div>
            {errors.whatsapp && <p className="text-mc-rojo text-xs mt-1">{errors.whatsapp}</p>}
          </div>

          <div>
            <InputField label="Email" value={form.email} onChange={v => set('email', v)} type="email" required placeholder="tu@email.com" />
            {errors.email && <p className="text-mc-rojo text-xs mt-1">{errors.email}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: '3px', accentColor: '#1C4D8C' }}
              />
              <span style={{ fontSize: '13px', color: '#656565', lineHeight: '1.5' }}>
                Acepto el tratamiento de mis datos según la{' '}
                <a href="/privacidad" style={{ color: '#1C4D8C', textDecoration: 'underline' }}>
                  política de privacidad
                </a>
              </span>
            </label>
            <input type="text" name="honeypot" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          </div>

          <button
            type="submit"
            disabled={loading || !consent}
            className="
              w-full py-4 mt-2 bg-mc-azul hover:bg-mc-azul-marino
              text-white font-spartan font-700 text-sm tracking-[0.1em] uppercase
              rounded-sm transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'PROCESANDO...' : 'VER MI DIAGNÓSTICO →'}
          </button>

          <p className="text-center text-xs text-gray-400 font-spartan">
            🔒 Tus datos son privados.
          </p>
        </form>
      </div>
    </main>
  )
}
