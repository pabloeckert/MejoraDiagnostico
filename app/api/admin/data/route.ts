import { NextRequest, NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/sheets'
import { sesionValida } from '@/lib/admin-auth'
import type { SessionRow, EventoRow } from '@/lib/admin'

const SHEET_FUNNEL = 'Funnel'
const SHEET_EVENTOS = 'Eventos'

function mapSession(row: string[]): SessionRow | null {
  const session_id = row[0]?.trim()
  if (!session_id) return null
  return {
    session_id,
    fecha_inicio: row[1] || '',
    nombre: row[2] || '',
    whatsapp: row[3] || '',
    perfil: row[4] || '',
    paso: row[5] || '',
    p1: row[6] || '',
    p2: row[7] || '',
    p3: row[8] || '',
    p4: row[9] || '',
    p5: row[10] || '',
    p6: row[11] || '',
    p7: row[12] || '',
    p8: row[13] || '',
    resultado_visto: row[14] || '',
    abandono_en: row[15] || '',
    ultimo_update: row[16] || '',
    cta_click: row[17] || '',
    visitor_id: row[18] || '',
    origen: row[19] || '',
    dispositivo: row[20] || '',
    tiempos_preguntas: row[21] || '',
    retomado: row[22] || '',
  }
}

function mapEvento(row: string[]): EventoRow | null {
  const session_id = row[2]?.trim()
  if (!session_id) return null
  return {
    timestamp: row[0] || '',
    visitor_id: row[1] || '',
    session_id,
    evento: row[3] || '',
    detalle: row[4] || '',
  }
}

export async function GET(req: NextRequest) {
  try {
    // Protección real: exige la cookie de sesión emitida por /api/admin/login.
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    if (
      !process.env.GOOGLE_SHEETS_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      console.error('admin/data: variables de entorno faltantes')
      return NextResponse.json({ ok: false, error: 'config' }, { status: 500 })
    }

    const sheets = await getSheetsClient()
    const [funnelRes, eventosRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: `${SHEET_FUNNEL}!A2:W`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: `${SHEET_EVENTOS}!A2:E`,
      }),
    ])

    const sessions = (funnelRes.data.values || [])
      .map(mapSession)
      .filter((s): s is SessionRow => s !== null)

    const eventos = (eventosRes.data.values || [])
      .map(mapEvento)
      .filter((e): e is EventoRow => e !== null)

    return NextResponse.json({ sessions, eventos })
  } catch (e) {
    console.error('admin/data error:', e)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
