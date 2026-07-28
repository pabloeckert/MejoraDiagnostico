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
})

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'notify', 6)) {
      return NextResponse.json({ ok: false, error: 'rate_limit' }, { status: 429 })
    }
    const data = Schema.parse(await req.json())
    const perfil = PERFILES[data.perfil as keyof typeof PERFILES]

    const mensaje = `
🔔 <b>Nuevo diagnóstico completado</b>

👤 <b>Nombre:</b> ${escapeHtml(data.nombre)}
📱 <b>WhatsApp:</b> ${escapeHtml(data.codPais)}${escapeHtml(data.whatsapp)}
🎯 <b>Perfil:</b> ${escapeHtml(perfil?.tag ?? data.perfil)}
💬 <b>Ref:</b> ${escapeHtml(perfil?.ref ?? '')}

<i>El usuario está esperando tu contacto.</i>
    `.trim()

    await sendTelegram(mensaje)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Notify error:', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
