'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  texto: string
  lineas?: number
  className?: string
  colorFade?: string // color de fondo detrás del texto, para que el degradé difumine hacia ese color exacto (ej. '#ffffff' o el tono del bloque de cierre)
}

export default function TextoExpandible({ texto, lineas = 3, className = '', colorFade = '#ffffff' }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expandido, setExpandido] = useState(false)
  const [truncado, setTruncado] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chequear = () => {
      setTruncado(el.scrollHeight > el.clientHeight + 2)
    }
    chequear()
    window.addEventListener('resize', chequear)
    return () => window.removeEventListener('resize', chequear)
  }, [texto])

  return (
    <div className="relative">
      <p
        ref={ref}
        className={className}
        style={
          expandido
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: lineas,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }
        }
      >
        {texto}
      </p>
      {!expandido && truncado && (
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, ${colorFade})` }}
        />
      )}
      {truncado && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="text-sm font-semibold text-mc-azul mt-1 underline underline-offset-2"
        >
          {expandido ? 'Mostrar menos' : 'Mostrar más'}
        </button>
      )}
    </div>
  )
}
