import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { PERFILES } from '@/lib/perfiles'
import { AREAS } from '@/lib/areas'

const resend = new Resend(process.env.RESEND_API_KEY)

const Schema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().default(''),
  empresa: z.string().default(''),
  codPais: z.string().min(1),
  whatsapp: z.string().min(6),
  perfil: z.string().min(1),
  honeypot: z.string().max(0),
  consent: z.literal(true),
  respuestas: z.array(z.number()).length(8),
})

function zona(pct: number) {
  if (pct < 40) return 'Zona Crítica'
  if (pct < 65) return 'Zona Media'
  return 'Sólido'
}

function buildAreas(respuestas: number[]) {
  return AREAS.map(a => {
    const pts = a.preguntas.reduce((s, i) => s + respuestas[i], 0)
    const pct = Math.round((pts / (a.preguntas.length * 4)) * 100)
    return { nombre: a.nombre, pct, zona: zona(pct) }
  })
}

export async function POST(req: NextRequest) {
  try {
    const d = Schema.parse(await req.json())
    const perfil = PERFILES[d.perfil as keyof typeof PERFILES]
    if (!perfil) throw new Error('Perfil inválido: ' + d.perfil)

    const areas = buildAreas(d.respuestas)
    const total = d.respuestas.reduce((a, b) => a + b, 0)
    const areasTxt = areas.map(a => `  ${a.nombre}: ${a.pct}% — ${a.zona}`).join('\n')

    const adminHtml = `
<h2>Nuevo lead: ${d.nombre} ${d.apellido} — ${perfil.tag}</h2>
<table>
  <tr><td><b>WhatsApp</b></td><td>${d.codPais}${d.whatsapp}</td></tr>
  <tr><td><b>Empresa</b></td><td>${d.empresa || '—'}</td></tr>
  <tr><td><b>Perfil</b></td><td>${perfil.tag}</td></tr>
  <tr><td><b>Puntaje</b></td><td>${total}/32</td></tr>
</table>
<h3>Diagnóstico por área</h3>
<pre>${areasTxt}</pre>
<h3>Respuestas individuales</h3>
<p>${d.respuestas.join(', ')}</p>
<h3>Descripción</h3>
<p>${perfil.desc}</p>
<h3>Verdad central</h3>
<p><b>${perfil.verdad}</b></p>
`

    await resend.emails.send({
      from: 'Mejora Continua <diagnostico@mejoraok.com>',
      to: 'diagnostico@mejoraok.com',
      subject: `Nuevo lead: ${d.nombre} — ${perfil.tag}`,
      html: adminHtml,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
