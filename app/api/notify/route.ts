import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PERFILES } from '@/lib/perfiles'

const Schema = z.object({
  nombre: z.string().min(1),
  whatsapp: z.string().min(6),
  codPais: z.string().min(1),
  perfil: z.string().min(1),
})

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('Telegram: variables de entorno faltantes')
    return
  }
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    }
  )
  if (!res.ok) console.error('Telegram error:', await res.text())
}

export async function POST(req: NextRequest) {
  try {
    const data = Schema.parse(await req.json())
    const perfil = PERFILES[data.perfil as keyof typeof PERFILES]

    const mensaje = `
🔔 <b>Nuevo diagnóstico completado</b>

👤 <b>Nombre:</b> ${data.nombre}
📱 <b>WhatsApp:</b> ${data.codPais}${data.whatsapp}
🎯 <b>Perfil:</b> ${perfil?.tag ?? data.perfil}
💬 <b>Ref:</b> ${perfil?.ref ?? ''}

<i>El usuario está esperando tu contacto.</i>
    `.trim()

    await sendTelegram(mensaje)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Notify error:', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
