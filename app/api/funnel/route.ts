import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { sheets_v4 } from 'googleapis'
import { PREGUNTAS } from '@/lib/preguntas'

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

async function updateCell(sheets: sheets_v4.Sheets, row: number, col: string, value: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${SHEET_NAME}!${col}${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
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
        '', 'NO', '', fecha,
      ]],
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, evento, timestamp, nombre, whatsapp, perfil, respuestas, paso } = body
    if (!session_id) return NextResponse.json({ ok: false })

    const sheets = await getSheets()
    let row = await findRow(sheets, session_id)

    if (!row) {
      await createRow(sheets, session_id, timestamp)
      row = await findRow(sheets, session_id)
    }
    if (!row) return NextResponse.json({ ok: false })

    await updateCell(sheets, row, 'Q', timestamp)

    switch (evento) {
      case 'diagnostico_iniciado':
        await updateCell(sheets, row, 'F', 'preguntas')
        break
      case 'nombre_ingresado':
        await updateCell(sheets, row, 'C', nombre || '')
        await updateCell(sheets, row, 'F', 'preguntas')
        break
      case 'preguntas_completadas':
        if (Array.isArray(respuestas)) {
          const cols = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
          for (let i = 0; i < 8; i++) {
            await updateCell(sheets, row, cols[i], textoRespuesta(i, respuestas[i]))
          }
        }
        await updateCell(sheets, row, 'F', 'formulario')
        break
      case 'formulario_completado':
        await updateCell(sheets, row, 'D', whatsapp || '')
        await updateCell(sheets, row, 'E', perfil || '')
        await updateCell(sheets, row, 'F', 'resultado')
        break
      case 'resultado_visto':
        await updateCell(sheets, row, 'O', 'SÍ')
        await updateCell(sheets, row, 'F', 'resultado_completo')
        break
      case 'abandono':
        await updateCell(sheets, row, 'P', paso || 'desconocido')
        break
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Error funnel:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
