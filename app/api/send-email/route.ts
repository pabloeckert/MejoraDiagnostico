import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(6),
  perfil: z.string().min(1),
  honeypot: z.string().max(0),
  consent: z.literal(true),
  adminPayload: z.string(),
  prospectoPayload: z.string(),
})

async function sendW3F(body: object) {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ access_key: process.env.W3F_KEY, ...body }),
  })
  if (!res.ok) throw new Error('W3F ' + res.status)
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const data = Schema.parse(await req.json())
    await Promise.all([
      sendW3F({
        to: 'diagnostico@mejoraok.com',
        subject: 'Nuevo lead: ' + data.nombre + ' - ' + data.perfil,
        message: data.adminPayload,
      }),
      sendW3F({
        to: data.email,
        subject: data.nombre + ', así estás hoy...',
        message: data.prospectoPayload,
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
