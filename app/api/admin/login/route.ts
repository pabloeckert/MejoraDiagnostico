import { NextRequest, NextResponse } from 'next/server'
import { passwordCorrecta, crearTokenSesion, sesionValida, COOKIE_SESION } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

// POST: valida la contraseña y, si es correcta, setea la cookie de sesión.
export async function POST(req: NextRequest) {
  // Freno de fuerza bruta: pocos intentos por minuto por IP.
  if (!rateLimit(req, 'admin-login', 8)) {
    return NextResponse.json({ ok: false, error: 'demasiados_intentos' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const clave = typeof body?.password === 'string' ? body.password : ''

  if (!passwordCorrecta(clave)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { token, maxAgeSegundos } = crearTokenSesion()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSegundos,
  })
  return res
}

// GET: informa si la cookie actual es válida (el cliente lo usa al montar).
export async function GET(req: NextRequest) {
  return NextResponse.json({ autenticado: sesionValida(req) })
}

// DELETE: cierra sesión borrando la cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESION, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
