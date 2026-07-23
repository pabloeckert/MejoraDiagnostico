import { google } from 'googleapis'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

// Test E2E contra producción: simula un diagnóstico completo real y verifica
// que llegue exactamente 1 mensaje de Telegram (formulario_completado) y que
// el Sheet quede con una fila limpia. Al final vacía el Sheet de nuevo.
//
// Uso: npx tsx scripts/test-e2e-completo.ts

const BASE_URL = 'https://diagnostico.mejoraok.com'
const SPREADSHEET_ID = '1BEx4efSVbB6n-L7sgeYuEBW0vveWQiAo8qSMai9COjA'

const NOMBRE_TEST = 'TEST AUTOMATIZADO — BORRAR'
const COD_PAIS = '+54'
const WA = '9000000000'
const WHATSAPP_FULL = COD_PAIS + WA
const RESPUESTAS = [3, 3, 3, 3, 1, 3, 1, 3]
const TIEMPOS = [3, 3, 3, 3, 3, 3, 3, 3]
const PERFIL_ESPERADO = 'SATURADO'
const PASOS_COMPLETADO = ['resultado', 'resultado_completo', 'whatsapp_contactado']
const EVENTOS_ESPERADOS = [
  'landing', 'nombre_ingresado',
  'pregunta_respondida', 'pregunta_respondida', 'pregunta_respondida', 'pregunta_respondida',
  'pregunta_respondida', 'pregunta_respondida', 'pregunta_respondida', 'pregunta_respondida',
  'preguntas_completadas', 'resultado_visto', 'formulario_completado',
]

const sessionId = randomUUID()
const visitorId = randomUUID()

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function postFunnel(evento: string, extra: Record<string, unknown> = {}) {
  const body = {
    session_id: sessionId,
    visitor_id: visitorId,
    evento,
    timestamp: new Date().toISOString(),
    ...extra,
  }
  const res = await fetch(`${BASE_URL}/api/funnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  console.log(`  → funnel[${evento}]: ${res.status} ${JSON.stringify(json)}`)
  return json as { ok?: boolean; duplicado?: boolean }
}

async function getSheets() {
  const keyFile = resolve(process.cwd(), 'mejoraproyecto-1604045f7248.json')
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function limpiarSheets(sheets: Awaited<ReturnType<typeof getSheets>>) {
  for (const hoja of ['Funnel', 'Eventos']) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A:A`,
    })
    const totalFilas = res.data.values?.length ?? 0
    if (totalFilas <= 1) continue
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A2:ZZ${totalFilas}`,
    })
  }
}

async function main() {
  console.log('═══ TEST E2E AUTOMATIZADO — producción ═══')
  console.log(`session_id: ${sessionId}`)
  console.log(`visitor_id: ${visitorId}`)
  console.log('')

  console.log('1. landing')
  await postFunnel('landing', { dispositivo: 'Desktop', origen: 'test_automatizado' })
  await sleep(400)

  console.log('2. nombre_ingresado')
  await postFunnel('nombre_ingresado', { nombre: NOMBRE_TEST })
  await sleep(400)

  console.log('3. pregunta_respondida x8')
  for (let i = 0; i < 8; i++) {
    await postFunnel('pregunta_respondida', { numero: i + 1, segundos: 3, valor: RESPUESTAS[i] })
    await sleep(300)
  }

  console.log('4. preguntas_completadas')
  await postFunnel('preguntas_completadas', { respuestas: RESPUESTAS, tiempos: TIEMPOS })
  await sleep(400)

  console.log('5. resultado_visto')
  await postFunnel('resultado_visto', { perfil: PERFIL_ESPERADO, whatsapp: WHATSAPP_FULL })
  await sleep(400)

  console.log('6. formulario_completado + send-email + notify (réplica exacta de handleSubmit en app/datos/page.tsx)')
  const funnelData = await postFunnel('formulario_completado', {
    whatsapp: WHATSAPP_FULL,
    perfil: PERFIL_ESPERADO,
  })
  await sleep(400)

  if (!funnelData.duplicado) {
    const emailRes = await fetch(`${BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: NOMBRE_TEST,
        apellido: '',
        empresa: '',
        whatsapp: WA,
        codPais: COD_PAIS,
        perfil: PERFIL_ESPERADO,
        respuestas: RESPUESTAS,
        honeypot: '',
        consent: true,
      }),
    })
    console.log(`  → send-email: ${emailRes.status}`)
    await sleep(400)

    const notifyRes = await fetch(`${BASE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: NOMBRE_TEST,
        whatsapp: WA,
        codPais: COD_PAIS,
        perfil: PERFIL_ESPERADO,
      }),
    })
    console.log(`  → notify: ${notifyRes.status}`)
  } else {
    console.log('  ⚠️ funnel marcó duplicado — no se llamó a send-email ni notify (igual que en producción real)')
  }

  console.log('')
  console.log('Esperando 5s para que las escrituras a Sheets se propaguen...')
  await sleep(5000)

  console.log('')
  console.log('═══ VERIFICACIÓN ═══')
  const sheets = await getSheets()
  const checks: { label: string; ok: boolean }[] = []

  const funnelRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Funnel!A:W',
  })
  const funnelRows: string[][] = funnelRes.data.values || []
  const filaFunnel = funnelRows.find(r => r[0] === sessionId)

  if (!filaFunnel) {
    checks.push({ label: 'Fila en "Funnel" para el session_id de test', ok: false })
  } else {
    checks.push({ label: 'Fila en "Funnel" para el session_id de test', ok: true })
    checks.push({ label: `nombre === "${NOMBRE_TEST}"`, ok: filaFunnel[2] === NOMBRE_TEST })
    checks.push({ label: `perfil === "${PERFIL_ESPERADO}"`, ok: filaFunnel[4] === PERFIL_ESPERADO })
    checks.push({ label: `whatsapp === "${WHATSAPP_FULL}"`, ok: filaFunnel[3] === WHATSAPP_FULL })
    checks.push({ label: `paso indica completado (${PASOS_COMPLETADO.join('/')})`, ok: PASOS_COMPLETADO.includes(filaFunnel[5]) })
  }

  const eventosRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Eventos!A:E',
  })
  const eventosRows: string[][] = eventosRes.data.values || []
  const eventosDeSesion = eventosRows.filter(r => r[2] === sessionId).map(r => r[3])

  for (const esperado of ['landing', 'nombre_ingresado', 'preguntas_completadas', 'resultado_visto', 'formulario_completado']) {
    checks.push({ label: `Evento "${esperado}" registrado en "Eventos"`, ok: eventosDeSesion.includes(esperado) })
  }
  const cantidadPreguntaRespondida = eventosDeSesion.filter(e => e === 'pregunta_respondida').length
  checks.push({ label: '8x evento "pregunta_respondida" registrados', ok: cantidadPreguntaRespondida === 8 })
  checks.push({
    label: `Total de eventos de la sesión === ${EVENTOS_ESPERADOS.length}`,
    ok: eventosDeSesion.length === EVENTOS_ESPERADOS.length,
  })

  console.log('')
  for (const c of checks) {
    console.log(`${c.ok ? '✅' : '❌'} ${c.label}`)
  }

  console.log('')
  console.log('⚠️ Revisá Telegram ahora — debería haber llegado EXACTAMENTE 1 mensaje (el de completado). Si llegó más de uno, o ninguno, hay un problema.')

  console.log('')
  console.log('Limpiando Sheet...')
  await limpiarSheets(sheets)
  console.log('Sheet limpiado — listo para leads reales.')

  const huboFallas = checks.some(c => !c.ok)
  process.exit(huboFallas ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
