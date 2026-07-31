'use client'
import { useCallback, useEffect, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  // Callback ref (no useRef): en /resultado el árbol con estos refs recién
  // se monta después de que `session` carga (la primera pasada muestra un
  // spinner sin estos nodos) — un efecto con deps [] atado a un useRef
  // corre una única vez, ANTES de que el nodo real exista, ve `null` y
  // nunca vuelve a intentarlo. El callback ref dispara `setEl` recién
  // cuando React efectivamente adjunta el nodo, sea en el primer render o
  // en uno posterior.
  const [el, setEl] = useState<T | null>(null)
  const [inView, setInView] = useState(false)
  const ref = useCallback((node: T | null) => setEl(node), [])

  useEffect(() => {
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
  }, [el])

  return { ref, inView }
}
