import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { PERFILES } from '@/lib/perfiles'
import { calcularScores, detectarPerfil } from '@/lib/scoring'
import { zonaColor } from '@/lib/areas'

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build')

const Schema = z.object({
  respuestas: z.array(z.number().min(1).max(4)).length(8),
})

export async function POST(req: NextRequest) {
  try {
    const d = Schema.parse(await req.json())
    const scores = calcularScores(d.respuestas)
    const perfil = detectarPerfil(scores)
    const p = PERFILES[perfil]
    const total = d.respuestas.reduce((a, b) => a + b, 0)

    const areaRows = (Object.entries(scores) as [string, number][])
      .map(([nombre, pct]) => {
        const { zona } = zonaColor(pct)
        return `<tr><td style="padding:4px 12px 4px 0;text-transform:capitalize">${nombre}</td><td style="padding:4px 0"><b>${pct}%</b> — ${zona}</td></tr>`
      })
      .join('')

    await resend.emails.send({
      from: 'Mejora Continua <diagnostico@mejoraok.com>',
      to: 'diagnostico@mejoraok.com',
      subject: `🔔 Diagnóstico completado`,
      html: `
        <h2 style="color:#1C4D8C">Diagnóstico completado — sin formulario aún</h2>
        <p><b>Perfil detectado:</b> ${p.tag}</p>
        <p><b>Descripción:</b> ${p.ref}</p>
        <p><b>Puntaje total:</b> ${total}/32</p>
        <h3>Áreas</h3>
        <table>${areaRows}</table>
        <p style="margin-top:16px;color:#888;font-size:13px">
          Si completa el formulario de datos, recibirás otro email con su contacto.
        </p>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[save-completion]', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
