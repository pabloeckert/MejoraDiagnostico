'use client'
import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Si ya está a la vista al montar (contenido sobre el pliegue, o la
    // página se abrió con scroll restaurado), no tiene sentido ocultarlo y
    // esperar un scroll que quizás no llegue.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px', ...options }
    )
    obs.observe(el)

    // Red de seguridad: el reveal es una mejora progresiva, nunca debe dejar
    // contenido oculto para siempre si el observer no llega a disparar.
    const fallback = setTimeout(() => setInView(true), 1500)

    return () => {
      obs.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  return { ref, inView }
}
