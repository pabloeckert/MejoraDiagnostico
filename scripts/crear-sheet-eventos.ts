import { google } from 'googleapis'
import { resolve } from 'path'

const SHEET_NAME = 'Eventos'
const HEADERS = ['timestamp', 'visitor_id', 'session_id', 'evento', 'detalle']

async function main() {
  const spreadsheetId = process.argv[2]
  if (!spreadsheetId) {
    console.error('Uso: npx tsx scripts/crear-sheet-eventos.ts <GOOGLE_SHEETS_ID>')
    console.error('El ID está en la URL del sheet: docs.google.com/spreadsheets/d/<ID>/edit')
    process.exit(1)
  }

  const keyFile = resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json')
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Leer sheets existentes
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const existentes = meta.data.sheets?.map(s => s.properties?.title) ?? []
  console.log('Pestañas actuales:', existentes)

  if (existentes.includes(SHEET_NAME)) {
    console.log(`La pestaña "${SHEET_NAME}" ya existe.`)
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    })
    console.log(`Pestaña "${SHEET_NAME}" creada.`)
  }

  // Escribir headers en fila 1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  })
  console.log('Headers escritos:', HEADERS.join(', '))
  console.log('¡Listo!')
}

main().catch(e => { console.error(e); process.exit(1) })
