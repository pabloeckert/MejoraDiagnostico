import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { detectarPerfil } from '@/lib/detectar'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas, zonaColor } from '@/lib/areas'

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build')

const Schema = z.object({
  respuestas: z.array(z.number().min(1).max(4)).length(8),
  lid: z.string().max(200).optional(),
})

function buildAreas(respuestas: number[]) {
  const calculated = calcularAreas(respuestas)
  return calculated.map(a => {
    const z = zonaColor(a.porcentaje)
    return { nombre: a.nombre, pct: a.porcentaje, zona: z.zona }
  })
}

export async function POST(req: NextRequest) {
  try {
    const d = Schema.parse(await req.json())
    const perfil = detectarPerfil(d.respuestas)
    const p = PERFILES[perfil]
    const areas = buildAreas(d.respuestas)
    const total = d.respuestas.reduce((a, b) => a + b, 0)

    const areaRows = areas
      .map(a => `<tr><td style="padding:4px 12px 4px 0">${a.nombre}</td><td style="padding:4px 0"><b>${a.pct}%</b> — ${a.zona}</td></tr>`)
      .join('')

    const lidHtml = d.lid
      ? `<p><b>Contacto:</b> ${d.lid}</p>`
      : `<p style="color:#888"><em>Sin link personalizado — contacto no identificado</em></p>`

    await resend.emails.send({
      from: 'Mejora Continua <diagnostico@mejoraok.com>',
      to: 'diagnostico@mejoraok.com',
      subject: `🔔 Diagnóstico completado${d.lid ? ` — ${d.lid}` : ''}`,
      html: `
        <h2 style="color:#1C4D8C">Diagnóstico completado — sin formulario aún</h2>
        ${lidHtml}
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
