'use client'
import { useState, useEffect } from 'react'
import { PERFILES } from '@/lib/perfiles'
import type { PerfilKey } from '@/lib/scoring'

// El gate real vive en page.tsx (server-side, redirige a /admin/login si la
// cookie no es válida). Este chequeo client-side es una segunda capa por si
// la cookie expira entre el render del server y el montaje del componente.
export default function PreviewClient() {
  const [autenticado, setAutenticado] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    fetch('/api/admin/login')
      .then((r) => r.json())
      .then((d) => setAutenticado(Boolean(d.autenticado)))
      .catch(() => setAutenticado(false))
      .finally(() => setVerificando(false))
  }, [])

  useEffect(() => {
    if (!verificando && !autenticado) {
      window.location.href = '/admin/login?next=/preview'
    }
  }, [verificando, autenticado])

  const cargarPerfil = (key: PerfilKey) => {
    // Genera scores dummy: 4 áreas al 60% para que el perfil se muestre sin lógica de detección real
    const scoresDummy = { personal: 60, organizacional: 60, comercial: 60, empresarial: 60 }
    sessionStorage.setItem('mc_diagnostico', JSON.stringify({
      respuestas: [3, 3, 3, 3, 3, 3, 3, 3],
      perfil: key,
      scores: scoresDummy,
      datos: { nombre: 'Vista Previa', codPais: '+54', whatsapp: '000000000' },
    }))
    window.open('/resultado', '_blank')
  }

  if (verificando || !autenticado) {
    return (
      <div className="min-h-screen bg-mc-azul flex items-center justify-center">
        <p className="text-white text-sm">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen h-screen overflow-y-auto overscroll-y-contain bg-white px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-mc-negro mb-2">Preview de Perfiles</h1>
      <p className="text-gray-700 mb-8">Elegí un perfil para ver la pantalla de resultado en una pestaña nueva. Se abre con scores dummy (60% en las 4 áreas).</p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-700 font-semibold">
          ⚠️ No toques el botón de WhatsApp en la pantalla de resultado — dispara una notificación real a Sindy por Telegram y queda registrado en Sheets como si fuera un lead real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {Object.keys(PERFILES).map((key) => {
          const perfil = PERFILES[key as PerfilKey]
          return (
            <button
              key={key}
              onClick={() => cargarPerfil(key as PerfilKey)}
              className="text-left border border-gray-200 rounded-lg p-4 hover:border-mc-azul transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-mc-azul mb-1">{perfil.tag}</p>
              <p className="text-sm text-gray-700">{key}</p>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => { fetch('/api/admin/login', { method: 'DELETE' }).finally(() => setAutenticado(false)) }}
        className="mt-8 text-sm text-gray-500 underline"
      >
        Cerrar sesión de preview
      </button>
    </div>
  )
}
