import { google } from 'googleapis'
import { resolve } from 'path'

const HOJAS = ['Funnel', 'Eventos']

async function main() {
  const spreadsheetId = process.argv[2]
  if (!spreadsheetId) {
    console.error('Uso: npx tsx scripts/limpiar-sheets.ts <GOOGLE_SHEETS_ID>')
    console.error('El ID está en la URL del sheet: docs.google.com/spreadsheets/d/<ID>/edit')
    process.exit(1)
  }

  const keyFile = resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json')
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  for (const hoja of HOJAS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${hoja}!A:A`,
    })
    const totalFilas = res.data.values?.length ?? 0
    const filasDeDatos = Math.max(0, totalFilas - 1)

    if (filasDeDatos === 0) {
      console.log(`${hoja}: sin filas de datos para borrar (solo header).`)
      continue
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${hoja}!A2:ZZ${totalFilas}`,
    })

    console.log(`${hoja}: ${filasDeDatos} fila(s) borradas (A2:${totalFilas}).`)
  }

  console.log('¡Listo!')
}

main().catch(e => { console.error(e); process.exit(1) })
