import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PERFILES } from '@/lib/perfiles'
import { sendTelegram } from '@/lib/telegram'
import { rateLimit } from '@/lib/rate-limit'
import { escapeHtml } from '@/lib/sanitize'

const Schema = z.object({
  nombre: z.string().min(1),
  whatsapp: z.string().min(6),
  codPais: z.string().min(1),
  perfil: z.string().min(1),
  pregunta0: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'notify', 6)) {
      return NextResponse.json({ ok: false, delivered: false, error: 'rate_limit' }, { status: 429 })
    }
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ ok: false, delivered: false, error: 'invalid_payload' }, { status: 400 })
    }
    const data = parsed.data
    const perfil = PERFILES[data.perfil as keyof typeof PERFILES]

    const mensaje = [
      `🔔 <b>Nuevo diagnóstico completado</b>`,
      ``,
      `👤 <b>Nombre:</b> ${escapeHtml(data.nombre)}`,
      `📱 <b>WhatsApp:</b> ${escapeHtml(data.codPais)}${escapeHtml(data.whatsapp)}`,
      `🎯 <b>Perfil:</b> ${escapeHtml(perfil?.tag ?? data.perfil)}`,
      data.pregunta0 ? `⚡ <b>Freno P0:</b> ${escapeHtml(data.pregunta0)}` : '',
      `💬 <b>Ref:</b> ${escapeHtml(perfil?.ref ?? '')}`,
      ``,
      `<i>El usuario completó su diagnóstico y recibió el Plan de 72h.</i>`,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await sendTelegram(mensaje)
    if (!result.ok) {
      const status = result.reason === 'missing_credentials' ? 503 : 502
      return NextResponse.json(
        { ok: false, delivered: false, reason: result.reason, error: result.error },
        { status }
      )
    }

    return NextResponse.json({ ok: true, delivered: true })
  } catch (e) {
    console.error('Notify error:', e)
    return NextResponse.json({ ok: false, delivered: false, error: 'server_error' }, { status: 500 })
  }
}
