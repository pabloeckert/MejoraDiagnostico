'use client'
import { useState, useEffect } from 'react'
import Dashboard from '@/components/admin/Dashboard'

// El gate real vive en page.tsx (server-side, redirige a /admin/login si la
// cookie no es válida). Este chequeo client-side es una segunda capa por si
// la cookie expira entre el render del server y el montaje del componente.
export default function AdminClient() {
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
      window.location.href = '/admin/login'
    }
  }, [verificando, autenticado])

  if (verificando || !autenticado) {
    return (
      <div className="min-h-screen bg-mc-azul flex items-center justify-center">
        <p className="text-white text-sm">Cargando…</p>
      </div>
    )
  }

  return <Dashboard />
}
