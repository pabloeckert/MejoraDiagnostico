import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { sheets_v4 } from 'googleapis'
import { PREGUNTAS } from '@/lib/preguntas'
import { sendTelegram } from '@/lib/telegram'

const SHEET_NAME = 'Funnel'

function textoRespuesta(preguntaIdx: number, valor: number): string {
  const opcion = PREGUNTAS[preguntaIdx]?.opciones.find(o => o.valor === valor)
  return opcion ? `${valor} — ${opcion.texto}` : String(valor)
}

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function findRow(sheets: sheets_v4.Sheets, sessionId: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A:A`,
  })
  const rows: string[][] = res.data.values || []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sessionId) return i + 1
  }
  return null
}

async function batchUpdateCells(sheets: sheets_v4.Sheets, row: number, updates: Record<string, string>) {
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
      values: [[
        sessionId, fecha, '', '', '',
        'inicio', '', '', '', '', '', '', '',
        '', 'NO', '', fecha, 'NO',
        '', '', '', '', '',
      ]],
    },
  })
}

async function buscarCompletadoPrevio(sheets: sheets_v4.Sheets, whatsapp: string, sessionActual: string): Promise<boolean> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!A:F`,
  })
  const rows: string[][] = res.data.values || []
  for (let i = 1; i < rows.length; i++) {
    const [sid, , , wa, , estado] = rows[i]
    if (sid !== sessionActual && wa === whatsapp && ['resultado', 'resultado_completo', 'whatsapp_contactado'].includes(estado)) {
      return true
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  let evento = 'desconocido'
  let session_id = 'desconocido'
  try {
    if (
      !process.env.GOOGLE_SHEETS_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      console.error('Funnel: variables de entorno faltantes')
      return NextResponse.json({ ok: false, error: 'config' }, { status: 500 })
    }

    const body = await req.json()
    const {
      session_id: sid, evento: ev, timestamp, nombre, whatsapp, perfil, respuestas, paso,
      visitor_id, referrer, utm_source, dispositivo, numero, tiempos, pasoRetomado,
    } = body
    session_id = sid ?? 'desconocido'
    evento = ev ?? 'desconocido'
    if (!sid) return NextResponse.json({ ok: false })

    const sheets = await getSheets()
    let row = await findRow(sheets, session_id)

    if (!row) {
      await createRow(sheets, session_id, timestamp)
      row = await findRow(sheets, session_id)
    }
    if (!row) return NextResponse.json({ ok: false })

    const updates: Record<string, string> = { Q: timestamp }

    switch (evento) {
      case 'landing':
        updates.S = visitor_id || ''
        updates.T = `${referrer || ''} ${utm_source ? '(' + utm_source + ')' : ''}`.trim()
        updates.U = dispositivo || ''
        break
      case 'diagnostico_iniciado':
        updates.F = 'preguntas'
        break
      case 'nombre_ingresado':
        updates.C = nombre || ''
        updates.F = 'preguntas'
        sendTelegram(`🟢 <b>Alguien empezó el diagnóstico</b>\n\n👤 ${nombre || 'Sin nombre'}`).catch(() => {})
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
        sendTelegram(`🔄 <b>Sesión retomada</b>\n\nAlguien volvió a continuar un diagnóstico que había dejado a medias.`).catch(() => {})
        break
    }

    if (evento === 'formulario_completado' && whatsapp) {
      const yaCompletado = await buscarCompletadoPrevio(sheets, whatsapp, session_id)
      if (yaCompletado) {
        await batchUpdateCells(sheets, row, { F: 'duplicado_bloqueado', Q: timestamp })
        return NextResponse.json({ ok: true, duplicado: true })
      }
    }

    await batchUpdateCells(sheets, row, updates)

    console.log('Funnel OK:', evento, session_id)
    return NextResponse.json({ ok: true, duplicado: false })
  } catch (e) {
    console.error('Funnel error en evento:', evento, 'session:', session_id, e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
