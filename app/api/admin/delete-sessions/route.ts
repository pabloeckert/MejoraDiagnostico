import { NextRequest, NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/sheets'

const SHEET_FUNNEL = 'Funnel'
const SHEET_EVENTOS = 'Eventos'

export async function POST(req: NextRequest) {
  try {
    if (
      !process.env.GOOGLE_SHEETS_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      console.error('admin/delete-sessions: variables de entorno faltantes')
      return NextResponse.json({ ok: false, error: 'config' }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const sessionIds: string[] = body?.session_ids

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'session_ids requerido' }, { status: 400 })
    }

    const idsSet = new Set(sessionIds.map((id) => String(id).trim()).filter(Boolean))
    if (idsSet.size === 0) {
      return NextResponse.json({ ok: false, error: 'session_ids requerido' }, { status: 400 })
    }

    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    const [funnelRes, eventosRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_FUNNEL}!A2:W` }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_EVENTOS}!A2:E` }),
    ])

    const funnelFilas = funnelRes.data.values || []
    const eventosFilas = eventosRes.data.values || []

    const funnelRangos = funnelFilas
      .map((row, i) => ({ row, fila: i + 2 }))
      .filter(({ row }) => idsSet.has((row[0] || '').trim()))
      .map(({ fila }) => `${SHEET_FUNNEL}!A${fila}:W${fila}`)

    const eventosRangos = eventosFilas
      .map((row, i) => ({ row, fila: i + 2 }))
      .filter(({ row }) => idsSet.has((row[2] || '').trim()))
      .map(({ fila }) => `${SHEET_EVENTOS}!A${fila}:E${fila}`)

    const ranges = [...funnelRangos, ...eventosRangos]

    if (ranges.length > 0) {
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: { ranges },
      })
    }

    return NextResponse.json({ ok: true, borradas: funnelRangos.length })
  } catch (e) {
    console.error('admin/delete-sessions error:', e)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
