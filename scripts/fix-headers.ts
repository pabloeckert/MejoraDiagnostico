import { google } from 'googleapis'
import { resolve } from 'path'

const SHEET_NAME = 'Funnel'
const HEADERS = [
  'session_id', 'fecha_inicio', 'nombre', 'whatsapp', 'perfil', 'paso',
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8',
  'resultado_visto', 'abandono_en', 'ultimo_update', 'cta_click',
  'visitor_id', 'origen', 'dispositivo', 'tiempos_preguntas', 'retomado',
]

async function main() {
  const spreadsheetId = process.argv[2]
  if (!spreadsheetId) {
    console.error('Uso: npx tsx scripts/fix-headers.ts <GOOGLE_SHEETS_ID>')
    console.error('El ID está en la URL del sheet: docs.google.com/spreadsheets/d/<ID>/edit')
    process.exit(1)
  }

  const keyFile = resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json')
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:W1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  })

  console.log(`Headers escritos en ${SHEET_NAME}!A1:W1 (${HEADERS.length} columnas):`)
  console.log(HEADERS.join(', '))
}

main().catch(e => { console.error(e); process.exit(1) })
