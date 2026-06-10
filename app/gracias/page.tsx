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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-white">

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-color.png" alt="Mejora Continua" className="h-12 mb-10 object-contain" />

      <h1 className="text-3xl sm:text-4xl font-bold text-mc-negro mb-4">
        {nombre ? `${nombre}, ya comenzamos.` : 'Ya comenzamos.'}
      </h1>

      <p className="text-mc-gris text-lg max-w-sm leading-relaxed mb-10">
        Sindy te contacta en las próximas horas.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">

        <a
          href="https://www.instagram.com/mejoraok"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-3 px-6 border border-gray-200 rounded-sm text-sm font-semibold text-mc-negro hover:border-mc-azul hover:text-mc-azul transition-colors duration-200"
        >
          Instagram · @mejoraok
        </a>

        <a
          href="https://www.facebook.com/mejoraok"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-3 px-6 border border-gray-200 rounded-sm text-sm font-semibold text-mc-negro hover:border-mc-azul hover:text-mc-azul transition-colors duration-200"
        >
          Facebook · mejoraok
        </a>

        <a
          href="https://wa.me/5493764358152"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-3 px-6 border border-gray-200 rounded-sm text-sm font-semibold text-mc-negro hover:border-mc-azul hover:text-mc-azul transition-colors duration-200"
        >
          WhatsApp · +54 9 376 435-8152
        </a>

        <a
          href="https://mejoraok.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-3 px-6 border border-gray-200 rounded-sm text-sm font-semibold text-mc-negro hover:border-mc-azul hover:text-mc-azul transition-colors duration-200"
        >
          mejoraok.com
        </a>

      </div>

    </div>
  )
}
