import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { calcularScores, detectarPerfil } from '@/lib/scoring'
import { PREGUNTAS, type RespuestaPosicion } from '@/lib/preguntas'
import { completeDiagnostico } from '@/lib/db/repository'
import { dispatchCompletedLead } from '@/lib/outbox/dispatch'
import { hasSheetsConfig } from '@/lib/db/sheets-store'
import { getSheetsClient } from '@/lib/sheets'

export const runtime = 'nodejs'

const CompleteSchema = z.object({
  sessionId: z.string().min(1).max(200),
  visitorId: z.string().max(200).optional(),
  nombre: z.string().min(1).max(200),
  codPais: z.string().min(1).max(10),
  whatsapp: z.string().min(6).max(30),
  respuestas: z.array(z.number().int().min(1).max(4)).length(8),
  posicion: z.enum(['fundador', 'heredero', 'gerente']).optional(),
  tiempos: z.array(z.number()).max(12).optional(),
  pregunta0: z
    .object({
      id: z.string().max(60),
      texto: z.string().max(300),
      dimension: z.string().max(40),
    })
    .optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  refContacto: z.string().max(200).optional(),
  honeypot: z.string().max(0),
  consent: z.literal(true),
})

function textoRespuesta(preguntaIdx: number, valor: number): string {
  const opcion = PREGUNTAS[preguntaIdx]?.opciones.find((o) => o.valor === valor)
  return opcion ? `${valor} — ${opcion.texto}` : String(valor)
}

async function syncFunnelSheetRow(params: {
  sessionId: string
  visitorId: string
  nombre: string
  whatsappFull: string
  perfil: string
  respuestas: number[]
  tiempos?: number[]
  timestamp: string
}): Promise<{ duplicado: boolean }> {
  if (!hasSheetsConfig()) return { duplicado: false }
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!

  // Buscar duplicado previo en Funnel
  const allRowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Funnel!A:F',
  })
  const allRows = (allRowsRes.data.values || []) as string[][]
  let targetRow: number | null = null
  let duplicado = false

  for (let i = 1; i < allRows.length; i++) {
    const [sid, , , wa, , estado] = allRows[i]
    if (sid === params.sessionId) targetRow = i + 1
    if (
      sid !== params.sessionId &&
      wa === params.whatsappFull &&
      ['resultado', 'resultado_completo', 'whatsapp_contactado'].includes(estado)
    ) {
      duplicado = true
    }
  }

  if (!targetRow) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Funnel!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            params.sessionId,
            params.timestamp,
            params.nombre,
            params.whatsappFull,
            params.perfil,
            duplicado ? 'duplicado_bloqueado' : 'resultado',
            ...params.respuestas.map((r, idx) => textoRespuesta(idx, r)),
            'NO',
            '',
            params.timestamp,
            'NO',
            params.visitorId,
            '',
            '',
            Array.isArray(params.tiempos) ? params.tiempos.join(',') : '',
            '',
          ],
        ],
      },
    })
  } else {
    const cols = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
    const updates: Record<string, string> = {
      C: params.nombre,
      D: params.whatsappFull,
      E: params.perfil,
      F: duplicado ? 'duplicado_bloqueado' : 'resultado',
      Q: params.timestamp,
    }
    if (Array.isArray(params.tiempos)) {
      updates.V = params.tiempos.join(',')
    }
    params.respuestas.forEach((r, idx) => {
      updates[cols[idx]] = textoRespuesta(idx, r)
    })

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: Object.entries(updates).map(([col, value]) => ({
          range: `Funnel!${col}${targetRow}`,
          values: [[value]],
        })),
      },
    })
  }

  await sheets.spreadsheets.values
    .append({
      spreadsheetId,
      range: 'Eventos!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            params.timestamp,
            params.visitorId,
            params.sessionId,
            'formulario_completado',
            duplicado ? 'duplicado_bloqueado' : `whatsapp: ${params.whatsappFull}`,
          ],
        ],
      },
    })
    .catch(() => {})

  return { duplicado }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'diagnostico_complete', 12)) {
      return NextResponse.json({ ok: false, error: 'rate_limit' }, { status: 429 })
    }

    const raw = await req.json().catch(() => null)
    const parsed = CompleteSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'invalid_payload', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data
    const nombreLimpio = d.nombre.trim()
    const waLimpio = d.whatsapp.replace(/\s+/g, '')
    const whatsappFull = `${d.codPais}${waLimpio}`
    const timestamp = new Date().toISOString()

    // Recalcular en servidor para prevenir tampering del cliente
    const scores = calcularScores(d.respuestas)
    const perfil = detectarPerfil(scores, d.posicion as RespuestaPosicion | undefined)

    // 1. Persistencia soberana en Repositorio Unificado (SQLite local + Sheets V3)
    const { leadId, prioridadIcp, briefComercial } = await completeDiagnostico({
      sessionId: d.sessionId,
      visitorId: d.visitorId,
      nombre: nombreLimpio,
      whatsapp: whatsappFull,
      perfil,
      scores,
      respuestas: d.respuestas,
      tiempos: d.tiempos,
      posicion: d.posicion,
      pregunta0Id: d.pregunta0?.id,
      pregunta0Texto: d.pregunta0?.texto,
      pregunta0Dimension: d.pregunta0?.dimension,
      utmSource: d.utmSource,
      refContacto: d.refContacto,
    })

    // 2. Sincronizar hoja histórica Funnel
    let duplicado = false
    try {
      const sheetRes = await syncFunnelSheetRow({
        sessionId: d.sessionId,
        visitorId: d.visitorId || '',
        nombre: nombreLimpio,
        whatsappFull,
        perfil,
        respuestas: d.respuestas,
        tiempos: d.tiempos,
        timestamp,
      })
      duplicado = sheetRes.duplicado
    } catch (sheetErr) {
      console.warn('[Complete] Error actualizando hoja Funnel:', sheetErr)
    }

    // 3. Despacho server-side Outbox (Contactos + Nucleo + Resend + Telegram) si no es duplicado
    let outbox = null
    if (!duplicado) {
      outbox = await dispatchCompletedLead({
        sessionId: d.sessionId,
        nombre: nombreLimpio,
        whatsapp: waLimpio,
        codPais: d.codPais,
        perfil,
        scores,
        respuestas: d.respuestas,
        pregunta0Texto: d.pregunta0?.texto,
        prioridadIcp,
        briefComercial,
        utmSource: d.utmSource,
        utmMedium: d.utmMedium,
        utmCampaign: d.utmCampaign,
        utmContent: d.utmContent,
      })
    }

    return NextResponse.json({
      ok: true,
      leadId,
      perfil,
      scores,
      prioridadIcp,
      duplicado,
      outbox,
    })
  } catch (error) {
    console.error('[Complete API] Error inesperado:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
