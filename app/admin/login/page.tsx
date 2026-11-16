'use client'
import { useState } from 'react'

// Único punto de entrada público para autenticarse (mismo mecanismo que
// siempre: POST a /api/admin/login, cookie httpOnly firmada). /admin y
// /preview redirigen acá cuando no hay cookie válida.
export default function AdminLoginPage() {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(false)

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
        const next = new URLSearchParams(window.location.search).get('next') || '/admin'
        window.location.href = next
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

  return (
    <div className="min-h-screen bg-mc-azul flex items-center justify-center px-6">
      <div className="bg-white rounded-lg overflow-hidden max-w-sm w-full shadow-lg">
        <div className="p-8">
          <h1 className="text-xl font-bold text-mc-negro mb-4">Acceso interno</h1>
          <div className="relative">
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Contraseña"
              aria-label="Contraseña de acceso"
              className="w-full min-h-[44px] border border-gray-300 rounded px-4 py-3 pr-12 mb-3 text-base focus:outline-none focus:ring-2 focus:ring-mc-azul"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostrarClave(!mostrarClave)}
              aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 -translate-y-1/2 -mt-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 cursor-pointer"
              tabIndex={-1}
            >
              {mostrarClave ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p className="text-mc-rojo text-sm mb-3 font-medium">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={enviando || !clave}
            className="w-full min-h-[44px] bg-mc-azul hover:bg-mc-azul-marino text-white font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{
            background:
              'linear-gradient(90deg, #1A3D84 0%, #1A3D84 60%, #E1061E 60%, #E1061E 80%, #F7CC13 80%, #F7CC13 100%)',
          }}
        />
      </div>
    </div>
  )
}
