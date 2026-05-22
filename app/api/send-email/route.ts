import { NextRequest, NextResponse } from 'next/server'
import { PERFILES } from '@/lib/perfiles'
import { calcularAreas, zonaColor } from '@/lib/areas'
import type { PerfilKey } from '@/lib/perfiles'

const W3F_URL = 'https://api.web3forms.com/submit'
const W3F_KEY = process.env.NEXT_PUBLIC_W3F_KEY ?? ''
const ADMIN_EMAIL = 'diagnostico@mejoraok.com'

type Payload = {
  form: {
    nombre: string; apellido: string; empresa: string
    codPais: string; whatsapp: string; email: string
  }
  perfil: PerfilKey
  total: number
  respuestas: number[]
}

function areasTxt(respuestas: number[]) {
  return calcularAreas(respuestas)
    .map(a => {
      const { zona } = zonaColor(a.porcentaje)
      return `  · ${a.nombre}: ${a.porcentaje}% (${zona})`
    })
    .join('\n')
}

async function sendW3F(to: string, subject: string, body: string) {
  await fetch(W3F_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: W3F_KEY,
      to,
      subject,
      message: body,
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { adminPayload, prospectoPayload } = (await req.json()) as {
      adminPayload: Payload
      prospectoPayload: Payload
    }

    const { form, perfil, total, respuestas } = adminPayload
    const p = PERFILES[perfil]
    const pct = Math.round((total / 32) * 100)
    const nombreCompleto = `${form.nombre} ${form.apellido}`.trim()

    const adminBody = `
Nuevo lead del diagnóstico

Nombre: ${nombreCompleto}
Empresa: ${form.empresa || '—'}
WhatsApp: ${form.codPais}${form.whatsapp}
Email: ${form.email}

Perfil: ${p.tag}
Referencia: ${p.ref}
Puntaje: ${total}/32 (${pct}%)

Diagnóstico por área:
${areasTxt(respuestas)}

Respuestas individuales:
${respuestas.map((v, i) => `  P${i + 1}: ${v}/4`).join('\n')}

Descripción: ${p.desc}

Verdad central: ${p.verdad}
    `.trim()

    await sendW3F(ADMIN_EMAIL, `Nuevo lead: ${nombreCompleto} - ${p.tag}`, adminBody)

    await new Promise(r => setTimeout(r, 1500))

    const prospectoBody = `
Hola ${prospectoPayload.form.nombre},

Este es tu diagnóstico de Mejora Continua.

─── TU PERFIL ───────────────────────────────────
${p.tag}
${p.ref}

${p.desc}

La verdad central:
"${p.verdad}"

─── TU DIAGNÓSTICO POR ÁREA ─────────────────────
${areasTxt(prospectoPayload.respuestas)}

─── ${p.cierreTitulo} ─────────────────────
${p.cierreTxt}

Estamos para acompañarte.
Mejora Continua

──────────────────────────────────────────────────
diagnostico.mejoraok.com
IG: mejoraok
WhatsApp: +54 9 376 435-8152
    `.trim()

    await sendW3F(
      prospectoPayload.form.email,
      `${prospectoPayload.form.nombre}, así estás hoy...`,
      prospectoBody
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
