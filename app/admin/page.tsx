'use client'
import { useState, useEffect } from 'react'
import Dashboard from '@/components/admin/Dashboard'

const ADMIN_PASSWORD = 'adminmc' // cambiar por una clave real

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(true)

  useEffect(() => {
    const auth = sessionStorage.getItem('mc_admin_auth')
    if (auth === 'true') setAutenticado(true)
  }, [])

  const handleLogin = () => {
    if (clave === ADMIN_PASSWORD) {
      sessionStorage.setItem('mc_admin_auth', 'true')
      setAutenticado(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-mc-azul flex items-center justify-center px-6">
        <div className="bg-white rounded-lg p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-mc-negro mb-4">Panel de Monitoreo</h1>
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
          {error && <p className="text-red-600 text-sm mb-3">Contraseña incorrecta</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-mc-azul text-white font-bold py-3 rounded"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return <Dashboard />
}
