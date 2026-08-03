// Autenticación del panel /admin — del lado del servidor.
//
// El modelo anterior comparaba la contraseña en el cliente (viajaba en el
// bundle JS, cualquiera la leía con DevTools) y las rutas /api/admin/* eran
// públicas. Ahora la contraseña se valida server-side y se emite una cookie
// httpOnly firmada con HMAC-SHA256; las rutas admin exigen esa cookie.
import { createHmac, timingSafeEqual, createHash } from 'crypto'
import type { NextRequest } from 'next/server'

export const COOKIE_SESION = 'mc_admin_session'
const DURACION_MS = 7 * 24 * 60 * 60 * 1000 // 7 días

// Contraseña y secreto de firma se leen de env vars; hay fallback para que el
// panel siga funcionando aunque las variables no estén cargadas en Vercel.
// El fallback vive solo en el servidor (nunca en el bundle del navegador).
function password(): string {
  return process.env.ADMIN_PASSWORD || 'AdminMC'
}
function secreto(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'mc-admin-secreto-fallback'
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function firmar(payloadB64: string): string {
  return b64url(createHmac('sha256', secreto()).update(payloadB64).digest())
}

// Comparación en tiempo constante (evita side-channel por longitud/contenido).
function igualSeguro(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function passwordCorrecta(intento: string): boolean {
  return typeof intento === 'string' && igualSeguro(intento, password())
}

export function crearTokenSesion(): { token: string; maxAgeSegundos: number } {
  const exp = Date.now() + DURACION_MS
  const payloadB64 = b64url(Buffer.from(JSON.stringify({ exp })))
  const token = `${payloadB64}.${firmar(payloadB64)}`
  return { token, maxAgeSegundos: Math.floor(DURACION_MS / 1000) }
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false
  const partes = token.split('.')
  if (partes.length !== 2) return false
  const [payloadB64, sig] = partes
  if (!igualSeguro(sig, firmar(payloadB64))) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

export function sesionValida(req: NextRequest): boolean {
  return tokenValido(req.cookies.get(COOKIE_SESION)?.value)
}
