'use client'
import { useEffect, useState } from 'react'

export default function GraciasPage() {
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('mc_diagnostico')
      if (raw) {
        const s = JSON.parse(raw)
        if (s.datos?.nombre) setNombre(s.datos.nombre)
        else if (s.nombre) setNombre(s.nombre)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-color.png" alt="Mejora Continua" className="h-12 sm:h-14 mb-8 object-contain" />

      <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-4">
        Listo{nombre ? `, ${nombre}` : ''}.
      </h1>

      <p className="text-mc-gris text-lg max-w-sm leading-relaxed mb-2">
        Sindy te contacta pronto.
      </p>

      <p className="text-mc-gris text-base max-w-sm leading-relaxed">
        Mientras tanto, ya tenés tu diagnóstico arriba.
      </p>
    </div>
  )
}
