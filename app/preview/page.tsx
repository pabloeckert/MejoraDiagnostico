'use client'
import { useState, useEffect } from 'react'
import { PERFILES } from '@/lib/perfiles'
import type { PerfilKey } from '@/lib/scoring'

// Reutiliza la misma cookie de sesión que /admin (server-side, HMAC-firmada)
// en vez de una contraseña hardcodeada en el bundle del cliente — antes
// cualquiera podía leer 'adminmc' con DevTools y entrar sin autenticarse.
export default function PreviewPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(true)

  useEffect(() => {
    fetch('/api/admin/login')
      .then((r) => r.json())
      .then((d) => setAutenticado(Boolean(d.autenticado)))
      .catch(() => setAutenticado(false))
      .finally(() => setVerificando(false))
  }, [])

  const handleLogin = async () => {
    if (!clave || enviando) return
    setEnviando(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clave }),
      })
      if (res.ok) {
        setAutenticado(true)
      } else if (res.status === 429) {
        setError('Demasiados intentos. Esperá un minuto.')
      } else {
        setError('Contraseña incorrecta')
      }
    } catch {
      setError('No se pudo conectar. Reintentá.')
    } finally {
      setEnviando(false)
    }
  }

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

  if (verificando) {
    return (
      <div className="min-h-screen bg-mc-azul flex items-center justify-center">
        <p className="text-white text-sm">Cargando…</p>
      </div>
    )
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-mc-azul flex items-center justify-center px-6">
        <div className="bg-white rounded-lg p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-mc-negro mb-4">Acceso interno</h1>
          <div className="relative">
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Contraseña"
              className="w-full border border-gray-300 rounded px-4 py-3 pr-12 mb-3 text-base"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostrarClave(!mostrarClave)}
              className="absolute right-3 top-1/2 -translate-y-1/2 -mt-1.5 text-gray-400"
              tabIndex={-1}
            >
              {mostrarClave ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={enviando}
            className="w-full bg-mc-azul text-white font-bold py-3 rounded disabled:opacity-60"
          >
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
        </div>
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
