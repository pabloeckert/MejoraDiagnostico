// Rate limiting simple por IP para las APIs públicas.
//
// Es in-memory (Map por instancia): en Vercel las funciones serverless son
// efímeras y no comparten estado entre instancias, así que esto es "best
// effort" — frena a un bot que abusa desde una IP contra una misma instancia
// caliente, que es el caso real de spam de emails/Telegram. Para un rate limit
// estricto a nivel global haría falta un store externo (Upstash/Redis).
import type { NextRequest } from 'next/server'

interface Ventana {
  conteo: number
  reinicioEn: number
}

const buckets = new Map<string, Ventana>()

export function ipDeRequest(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim()
  return ip || req.headers.get('x-real-ip') || 'desconocida'
}

// Devuelve true si la request está permitida; false si superó el límite.
export function permitido(clave: string, maxPorVentana: number, ventanaMs: number): boolean {
  const ahora = Date.now()
  const actual = buckets.get(clave)

  if (!actual || ahora > actual.reinicioEn) {
    buckets.set(clave, { conteo: 1, reinicioEn: ahora + ventanaMs })
    // Limpieza oportunista para que el Map no crezca indefinidamente.
    if (buckets.size > 5000) {
      Array.from(buckets.entries()).forEach(([k, v]) => {
        if (ahora > v.reinicioEn) buckets.delete(k)
      })
    }
    return true
  }

  if (actual.conteo >= maxPorVentana) return false
  actual.conteo++
  return true
}

// Helper de conveniencia: limita por IP + nombre de ruta.
export function rateLimit(req: NextRequest, ruta: string, maxPorMinuto: number): boolean {
  return permitido(`${ruta}:${ipDeRequest(req)}`, maxPorMinuto, 60_000)
}
