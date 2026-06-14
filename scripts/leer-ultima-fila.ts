import { google } from 'googleapis'
import { resolve } from 'path'

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1BEx4efSVbB6n-L7sgeYuEBW0vveWQiAo8qSMai9COjA',
    range: 'Funnel!A:Q',
  })
  const rows = res.data.values ?? []
  console.log(`Total filas (incl. header): ${rows.length}`)
  const headers = rows[0]
  const last = rows[rows.length - 1]
  console.log('\n── Última fila ──')
  headers.forEach((h: string, i: number) => {
    const val = last[i] ?? '—'
    console.log(`  ${h.padEnd(20)} ${val}`)
  })
}
main().catch(e => { console.error(e); process.exit(1) })
