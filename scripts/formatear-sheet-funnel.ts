import { google } from 'googleapis'
import { resolve } from 'path'

const SHEET_NAME = 'Funnel'
const SPREADSHEET_ID = process.argv[2]

// Paleta Mejora Continua
const AZUL_MARINO = { red: 0.286, green: 0.373, blue: 0.576 }  // #495F93
const AZUL       = { red: 0.110, green: 0.302, blue: 0.549 }  // #1C4D8C
const GRIS_CLARO = { red: 0.949, green: 0.949, blue: 0.949 }  // #F2F2F2
const BLANCO     = { red: 1,     green: 1,     blue: 1     }
const NEGRO      = { red: 0.051, green: 0.051, blue: 0.051 }  // #0D0D0D
const GRIS       = { red: 0.396, green: 0.396, blue: 0.396 }  // #656565

async function main() {
  if (!SPREADSHEET_ID) {
    console.error('Uso: npx tsx scripts/formatear-sheet-funnel.ts <GOOGLE_SHEETS_ID>')
    process.exit(1)
  }

  const keyFile = resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json')
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Obtener sheetId de la pestaña Funnel
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME)
  if (!sheet) { console.error('Pestaña Funnel no encontrada'); process.exit(1) }
  const sheetId = sheet.properties!.sheetId!

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [

        // ── 1. Fila de headers: fondo azul marino, texto blanco, bold, centrado ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: AZUL_MARINO,
                textFormat: { foregroundColor: BLANCO, bold: true, fontSize: 10,
                  fontFamily: 'Arial' },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: { top: 8, bottom: 8, left: 6, right: 6 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
          },
        },

        // ── 2. Filas de datos: fondo blanco, texto negro ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000 },
            cell: {
              userEnteredFormat: {
                backgroundColor: BLANCO,
                textFormat: { foregroundColor: NEGRO, fontSize: 10, fontFamily: 'Arial' },
                verticalAlignment: 'MIDDLE',
                padding: { top: 6, bottom: 6, left: 6, right: 6 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,padding)',
          },
        },

        // ── 3. Columna A (session_id): texto gris pequeño ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { foregroundColor: GRIS, fontSize: 9, fontFamily: 'Arial' },
              },
            },
            fields: 'userEnteredFormat.textFormat',
          },
        },

        // ── 4. Columna E (perfil): azul, bold ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 4, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                textFormat: { foregroundColor: AZUL, bold: true, fontSize: 10, fontFamily: 'Arial' },
              },
            },
            fields: 'userEnteredFormat.textFormat',
          },
        },

        // ── 5. Columnas G–N (respuestas p1–p8): centradas, gris ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 14 },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                textFormat: { foregroundColor: GRIS, fontSize: 10, fontFamily: 'Arial' },
              },
            },
            fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
          },
        },

        // ── 6. Columna O (resultado_visto): centrada ──
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 14, endColumnIndex: 15 },
            cell: {
              userEnteredFormat: { horizontalAlignment: 'CENTER' },
            },
            fields: 'userEnteredFormat.horizontalAlignment',
          },
        },

        // ── 7. Congelar fila de headers ──
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },

        // ── 8. Anchos de columna ──
        ...([
          [0,  180],  // A session_id
          [1,  160],  // B fecha_inicio
          [2,  120],  // C nombre
          [3,  140],  // D whatsapp
          [4,  180],  // E perfil
          [5,  130],  // F paso
          [6,  220],  // G p1
          [7,  220],  // H p2
          [8,  220],  // I p3
          [9,  220],  // J p4
          [10, 220],  // K p5
          [11, 220],  // L p6
          [12, 220],  // M p7
          [13, 220],  // N p8
          [14, 120],  // O resultado_visto
          [15, 120],  // P abandono_en
          [16, 180],  // Q ultimo_update
        ] as [number, number][]).map(([col, px]) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: col, endIndex: col + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),

        // ── 9. Altura de filas de datos ──
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 1000 },
            properties: { pixelSize: 36 },
            fields: 'pixelSize',
          },
        },

        // ── 10. Altura de header ──
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 42 },
            fields: 'pixelSize',
          },
        },

        // ── 11. Borde inferior al header ──
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            bottom: {
              style: 'SOLID_MEDIUM',
              color: AZUL,
            },
          },
        },

        // ── 12. Bordes suaves en datos ──
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000 },
            bottom: { style: 'SOLID', color: GRIS_CLARO },
            innerHorizontal: { style: 'SOLID', color: GRIS_CLARO },
          },
        },

      ],
    },
  })

  console.log('✅ Sheet formateado con identidad Mejora Continua')
}

main().catch(e => { console.error(e); process.exit(1) })
