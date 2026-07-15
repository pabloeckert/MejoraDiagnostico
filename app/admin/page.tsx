'use client'
import { useState, useEffect } from 'react'
import Dashboard from '@/components/admin/Dashboard'

const ADMIN_PASSWORD = 'mcadmin2026' // cambiar por una clave real

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)

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
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Contraseña"
            className="w-full border border-gray-300 rounded px-4 py-3 mb-3 text-base"
            autoFocus
          />
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
