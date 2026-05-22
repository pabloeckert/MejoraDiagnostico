import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas, zonaColor } from '@/lib/areas'
import type { PerfilKey } from '@/lib/perfiles'

const Schema = z.object({
  nombre: z.string().min(1),
  apellido: z.string(),
  empresa: z.string(),
  email: z.string().email(),
  whatsapp: z.string().min(6),
  codPais: z.string(),
  perfil: z.string().min(1),
  respuestas: z.array(z.number()).length(8),
  honeypot: z.string().max(0),
  consent: z.literal(true),
})

type Data = z.infer<typeof Schema>

function areasTxt(respuestas: number[]): string {
  return calcularAreas(respuestas)
    .map(a => `  ${a.nombre}: ${a.porcentaje}% — ${zonaColor(a.porcentaje).zona}`)
    .join('\n')
}

function buildAdmin(d: Data): string {
  const p = PERFILES[d.perfil as PerfilKey]
  const total = d.respuestas.reduce((a, b) => a + b, 0)
  return [
    `NUEVO LEAD — ${p.tag}`,
    '',
    `Nombre: ${d.nombre} ${d.apellido}`.trimEnd(),
    `Empresa: ${d.empresa || '—'}`,
    `WhatsApp: ${d.codPais}${d.whatsapp}`,
    `Email: ${d.email}`,
    '',
    `PUNTAJE TOTAL: ${total}/32`,
    'ÁREAS:',
    areasTxt(d.respuestas),
    '',
    `RESPUESTAS: ${d.respuestas.join(', ')}`,
    `DESCRIPCIÓN: ${p.desc}`,
    `VERDAD CENTRAL: ${p.verdad}`,
  ].join('\n')
}

function buildProspecto(d: Data): string {
  const p = PERFILES[d.perfil as PerfilKey]
  return [
    `${d.nombre}, así estás hoy...`,
    '',
    p.ref,
    '',
    p.desc,
    '',
    'La verdad central:',
    p.verdad,
    '',
    'TU DIAGNÓSTICO POR ÁREA:',
    areasTxt(d.respuestas),
    '',
    p.cierreTitulo,
    p.cierreTxt,
    '',
    '---',
    'Mejora Continua · diagnostico.mejoraok.com · IG: mejoraok · WhatsApp: +54 9 376 435-8152',
  ].join('\n')
}

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
    const p = PERFILES[data.perfil as PerfilKey]
    await Promise.all([
      sendW3F({
        to: 'diagnostico@mejoraok.com',
        subject: `Nuevo lead: ${data.nombre} ${data.apellido} — ${p.tag}`.trimEnd(),
        message: buildAdmin(data),
      }),
      sendW3F({
        to: data.email,
        subject: `${data.nombre}, así estás hoy...`,
        message: buildProspecto(data),
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
