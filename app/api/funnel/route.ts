import { NextRequest, NextResponse } from 'next/server'
import type { sheets_v4 } from 'googleapis'
import { z } from 'zod'
import { PREGUNTAS } from '@/lib/preguntas'
import { rateLimit } from '@/lib/rate-limit'
import { getSheetsClient } from '@/lib/sheets'
import { hasSheetsConfig } from '@/lib/db/sheets-store'
import {
  completeDiagnostico,
  movePipelineLead,
  recordProgress,
} from '@/lib/db/repository'
import { calcularScores, type Scores } from '@/lib/scoring'

export const runtime = 'nodejs'

const SHEET_NAME = 'Funnel'
const SHEET_EVENTOS = 'Eventos'

const FunnelSchema = z
  .object({
    session_id: z.string().min(1).max(200),
    visitor_id: z.string().max(200).optional(),
    evento: z.string().min(1).max(60),
    timestamp: z.string().max(60).optional(),
    nombre: z.string().max(200).optional(),
    whatsapp: z.string().max(50).optional(),
    perfil: z.string().max(60).optional(),
    respuestas: z.array(z.number()).max(8).optional(),
    scores: z
      .object({
        personal: z.number(),
        organizacional: z.number(),
        comercial: z.number(),
        empresarial: z.number(),
      })
      .optional(),
    posicion: z.string().max(40).optional(),
    opcion_id: z.string().max(60).optional(),
    opcion_texto: z.string().max(300).optional(),
    dimension: z.string().max(40).optional(),
    arquetipo: z.string().max(60).optional(),
    paso: z.string().max(60).optional(),
    referrer: z.string().max(500).optional(),
    utm_source: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    origen: z.string().max(200).optional(),
    dispositivo: z.string().max(30).optional(),
    numero: z.number().optional(),
    tiempos: z.array(z.number()).max(20).optional(),
    pasoRetomado: z.string().max(60).optional(),
    segundos: z.number().optional(),
    valor: z.number().optional(),
  })
  .passthrough()

function textoRespuesta(preguntaIdx: number, valor: number): string {
  const opcion = PREGUNTAS[preguntaIdx]?.opciones.find((o) => o.valor === valor)
  return opcion ? `${valor} — ${opcion.texto}` : String(valor)
}

function construirDetalle(
  evento: string,
  ctx: {
    nombre?: string
    whatsapp?: string
    numero?: number
    segundos?: number
    valor?: number
    tiempos?: number[]
    paso?: string
    pasoRetomado?: string
    dispositivo?: string
    origen?: string
    opcion_id?: string
    dimension?: string
    arquetipo?: string
  }
): string {
  switch (evento) {
    case 'landing':
      return `${ctx.dispositivo || ''} · ${ctx.origen || ''}`.trim()
    case 'landing_pregunta_0_vista':
      return 'vio Pregunta 0'
    case 'pregunta_0_respondida':
      return `p0: ${ctx.opcion_id || ''} (${ctx.dimension || ''})`
    case 'visita_bloqueada_reintento':
      return `bloqueo 72h · arquetipo: ${ctx.arquetipo || ''}`
    case 'diagnostico_iniciado':
      return 'inició el diagnóstico'
    case 'nombre_ingresado':
      return `nombre: ${ctx.nombre || ''}`
    case 'pregunta_respondida':
      return `pregunta ${ctx.numero ?? ''} · ${ctx.segundos ?? ''}s · valor ${ctx.valor ?? ''}`
    case 'preguntas_completadas':
      return `8 preguntas · tiempos: ${Array.isArray(ctx.tiempos) ? ctx.tiempos.join(',') : ''}`
    case 'formulario_completado':
      return `whatsapp: ${ctx.whatsapp || ''}`
    case 'resultado_visto':
      return 'resultado visto'
    case 'cta_click':
      return 'click en CTA de WhatsApp'
    case 'abandono':
      return `abandonó en: ${ctx.paso || 'desconocido'}`
    case 'sesion_retomada':
      return `retomó en: ${ctx.pasoRetomado || ''}`
    case 'alerta_fallida':
      return `notificación con fallas — ${ctx.paso || ''}`
    default:
      return ''
  }
}

async function findRow(sheets: sheets_v4.Sheets, sessionId: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A:A`,
  })
  const rows: string[][] = (res.data.values || []) as string[][]
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sessionId) return i + 1
  }
  return null
}

async function batchUpdateCells(
  sheets: sheets_v4.Sheets,
  row: number,
  updates: Record<string, string>
) {
  const data = Object.entries(updates).map(([col, value]) => ({
    range: `${SHEET_NAME}!${col}${row}`,
    values: [[value]],
  }))
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    requestBody: { valueInputOption: 'RAW', data },
  })
}

async function createRow(sheets: sheets_v4.Sheets, sessionId: string, fecha: string) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          sessionId,
          fecha,
          '',
          '',
          '',
          'inicio',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'NO',
          '',
          fecha,
          'NO',
          '',
          '',
          '',
          '',
          '',
        ],
      ],
    },
  })
}

async function registrarEvento(
  sheets: sheets_v4.Sheets,
  sessionId: string,
  visitorId: string,
  evento: string,
  detalle: string,
  timestamp: string
) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${SHEET_EVENTOS}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[timestamp || '', visitorId || '', sessionId, evento, detalle]] },
    })
  } catch (e) {
    console.error('Eventos error en evento:', evento, 'session:', sessionId, e)
  }
}

async function buscarCompletadoPrevio(
  sheets: sheets_v4.Sheets,
  whatsapp: string,
  sessionActual: string
): Promise<boolean> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A:F`,
  })
  const rows: string[][] = (res.data.values || []) as string[][]
  for (let i = 1; i < rows.length; i++) {
    const [sid, , , wa, , estado] = rows[i]
    if (
      sid !== sessionActual &&
      wa === whatsapp &&
      ['resultado', 'resultado_completo', 'whatsapp_contactado'].includes(estado)
    ) {
      return true
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  let evento = 'desconocido'
  let session_id = 'desconocido'
  try {
    if (!rateLimit(req, 'funnel', 60)) {
      return NextResponse.json({ ok: false, error: 'rate_limit' }, { status: 429 })
    }

    const parsed = FunnelSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'payload_invalido' }, { status: 400 })
    }
    const {
      session_id: sid,
      evento: ev,
      timestamp,
      nombre,
      whatsapp,
      perfil,
      respuestas,
      scores: payloadScores,
      posicion,
      opcion_id,
      opcion_texto,
      dimension,
      arquetipo,
      paso,
      visitor_id,
      referrer,
      utm_source,
      dispositivo,
      numero,
      tiempos,
      pasoRetomado,
      segundos,
      valor,
    } = parsed.data
    session_id = sid
    evento = ev

    if (ev === 'formulario_completado') {
      const scoresCalculados: Scores =
        payloadScores ||
        (Array.isArray(respuestas) && respuestas.length === 8
          ? calcularScores(respuestas)
          : { personal: 0, organizacional: 0, comercial: 0, empresarial: 0 })

      await completeDiagnostico({
        sessionId: sid,
        visitorId: visitor_id,
        nombre: nombre || '',
        whatsapp: whatsapp || '',
        perfil: perfil || 'SATURADO',
        scores: scoresCalculados,
        respuestas,
        tiempos,
        posicion,
        pregunta0Id: opcion_id,
        pregunta0Texto: opcion_texto,
        pregunta0Dimension: dimension,
        utmSource: utm_source,
      })
    } else if (ev === 'cta_click') {
      await movePipelineLead({
        leadId: sid,
        nuevaEtapa: 'EN_CONTACTO_WHATSAPP',
      })
    } else {
      await recordProgress({
        sessionId: sid,
        visitorId: visitor_id,
        evento: ev,
        numero,
        segundos,
        valor,
        nombre,
        pregunta0Id: opcion_id,
        pregunta0Texto: opcion_texto,
        pregunta0Dimension: dimension,
        utmSource: utm_source,
      })
    }

    if (!hasSheetsConfig()) {
      return NextResponse.json({ ok: true, sqlite: true, sheets: false })
    }

    const sheets = await getSheetsClient()
    let row = await findRow(sheets, session_id)

    if (!row) {
      await createRow(sheets, session_id, timestamp ?? '')
      row = await findRow(sheets, session_id)
    }
    if (!row) return NextResponse.json({ ok: false })

    const updates: Record<string, string> = { Q: timestamp ?? '' }
    const origen = `${referrer || ''} ${utm_source ? '(' + utm_source + ')' : ''}`.trim()

    switch (evento) {
      case 'landing':
        updates.S = visitor_id || ''
        updates.T = origen
        updates.U = dispositivo || ''
        break
      case 'landing_pregunta_0_vista':
        updates.S = visitor_id || ''
        break
      case 'pregunta_0_respondida':
        updates.F = `pregunta_0_${opcion_id || ''}`
        if (visitor_id) updates.S = visitor_id
        break
      case 'visita_bloqueada_reintento':
        updates.F = 'bloqueado_72h'
        break
      case 'diagnostico_iniciado':
        updates.F = 'preguntas'
        break
      case 'nombre_ingresado':
        if (nombre) updates.C = nombre
        updates.F = 'preguntas'
        break
      case 'pregunta_respondida':
        updates.F = `pregunta_${numero}`
        break
      case 'preguntas_completadas':
        if (Array.isArray(respuestas)) {
          const cols = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
          for (let i = 0; i < 8; i++) {
            updates[cols[i]] = textoRespuesta(i, respuestas[i])
          }
        }
        if (Array.isArray(tiempos)) {
          updates.V = tiempos.join(',')
        }
        updates.F = 'formulario'
        break
      case 'formulario_completado':
        if (nombre) updates.C = nombre
        updates.D = whatsapp || ''
        updates.E = perfil || ''
        updates.F = 'resultado'
        break
      case 'resultado_visto':
        updates.O = 'SÍ'
        updates.F = 'resultado_completo'
        break
      case 'cta_click':
        updates.R = 'SÍ'
        updates.F = 'whatsapp_contactado'
        break
      case 'abandono':
        updates.P = paso || 'desconocido'
        break
      case 'sesion_retomada':
        updates.W = 'SÍ'
        updates.F = `retomado_${pasoRetomado || ''}`
        break
    }

    if (evento === 'formulario_completado' && whatsapp) {
      const yaCompletado = await buscarCompletadoPrevio(sheets, whatsapp, session_id)
      if (yaCompletado) {
        await batchUpdateCells(sheets, row, { F: 'duplicado_bloqueado', Q: timestamp ?? '' })
        registrarEvento(
          sheets,
          session_id,
          visitor_id ?? '',
          evento,
          'duplicado_bloqueado',
          timestamp ?? ''
        )
        return NextResponse.json({ ok: true, duplicado: true })
      }
    }

    await batchUpdateCells(sheets, row, updates)

    const detalle = construirDetalle(evento, {
      nombre,
      whatsapp,
      numero,
      segundos,
      valor,
      tiempos,
      paso,
      pasoRetomado,
      dispositivo,
      origen,
      opcion_id,
      dimension,
      arquetipo,
    })
    registrarEvento(sheets, session_id, visitor_id ?? '', evento, detalle, timestamp ?? '')

    return NextResponse.json({ ok: true, duplicado: false })
  } catch (e) {
    console.error('Funnel error en evento:', evento, 'session:', session_id, e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
