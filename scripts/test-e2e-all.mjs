import { getDatabase } from '../lib/db/sqlite.ts'

const BASE_URL = 'http://localhost:3000'

console.log('=================================================================')
console.log('🚀 AUDITORÍA INTEGRAL V3 · MEJORADIAGNOSTICO')
console.log('=================================================================\n')

async function run() {
  const db = getDatabase()
  let fallos = 0

  // 1. Landing ("/") con Pregunta Cero
  try {
    const res = await fetch(`${BASE_URL}/`)
    const html = await res.text()
    if (res.ok && html.includes('En tu día a día como líder, ¿qué sentís que te frena más?')) {
      console.log('✅ 1. Landing ("/") con Pregunta Cero: OK')
    } else {
      console.error('❌ 1. Landing: Falló Pregunta Cero')
      fallos++
    }
  } catch (e) {
    console.error('❌ 1. Landing error:', e.message)
    fallos++
  }

  // 2. Blindaje de /test-lab sin sesión (debe redirigir a login / responder 401 en API)
  try {
    const resPage = await fetch(`${BASE_URL}/test-lab`, { redirect: 'manual' })
    const resApi = await fetch(`${BASE_URL}/api/test-lab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' }),
    })
    if ((resPage.status === 307 || resPage.status === 302) && resApi.status === 401) {
      console.log('✅ 2. Blindaje /test-lab y /api/test-lab sin auth: OK (307 + 401)')
    } else {
      console.error('❌ 2. Blindaje /test-lab falló:', resPage.status, resApi.status)
      fallos++
    }
  } catch (e) {
    console.error('❌ 2. Test-Lab Auth error:', e.message)
    fallos++
  }

  // 3. Telemetría Temprana (T = 0 ms) + Breaker 72h + Bypass ?force=1
  const testFp = `fp_audit_v3_${Date.now()}`
  let sessionId = ''
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint: testFp,
        utms: { utm_source: 'auditoria_v3', utm_campaign: 'sprint5' },
        referrer: 'https://instagram.com',
      }),
    })
    const data = await res.json()
    if (res.status === 201 && data.sesionId && !data.blocked) {
      sessionId = data.sesionId
      console.log('✅ 3. Telemetría T=0ms: OK')
    } else {
      console.error('❌ 3. Telemetría falló:', data)
      fallos++
    }
  } catch (e) {
    console.error('❌ 3. Telemetría error:', e.message)
    fallos++
  }

  // 4. Completar diagnóstico atómico (/api/diagnostico/complete) -> Persiste nombre, 4D, P0, ICP y Brief
  try {
    const resComplete = await fetch(`${BASE_URL}/api/diagnostico/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        visitorId: testFp,
        nombre: 'Auditoría V3',
        codPais: '+54',
        whatsapp: '93764555444',
        respuestas: [1, 2, 1, 2, 1, 2, 1, 2],
        tiempos: [4, 6, 15, 5, 4, 8, 5, 3],
        pregunta0: {
          id: 'incendios',
          texto: 'Apagar incendios operativos y no tener tiempo para pensar',
          dimension: 'personal',
        },
        honeypot: '',
        consent: true,
      }),
    })
    const compData = await resComplete.json()
    const sesRow = db
      .prepare('SELECT * FROM diagnostico_sesiones WHERE sesion_id = ?')
      .get(sessionId)
    const pipeRow = db
      .prepare('SELECT * FROM diagnostico_pipeline_comercial WHERE sesion_id = ?')
      .get(sessionId)

    if (
      resComplete.ok &&
      compData.ok &&
      sesRow?.nombre === 'Auditoría V3' &&
      sesRow?.score_personal > 0 &&
      sesRow?.pregunta_0_id === 'incendios' &&
      pipeRow?.prioridad_icp &&
      pipeRow?.brief_comercial
    ) {
      console.log(`✅ 4. /api/diagnostico/complete -> Persistencia integral OK (${compData.perfil}, ICP: ${compData.prioridadIcp})`)
    } else {
      console.error('❌ 4. Complete API incompleto:', { compData, sesRow, pipeRow })
      fallos++
    }
  } catch (e) {
    console.error('❌ 4. Complete API error:', e.message)
    fallos++
  }

  // 5. Breaker Anti-Picardía 72h y ?force=1
  try {
    const resBloqueo = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: testFp }),
    })
    const dataBloqueo = await resBloqueo.json()

    const resForce = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: testFp, force: true }),
    })
    const dataForce = await resForce.json()

    if (dataBloqueo.blocked && dataForce.estado === 'INTENTO_SECUNDARIO_MUTADO') {
      console.log('✅ 5. Breaker 72h + Bypass ?force=1: OK')
    } else {
      console.error('❌ 5. Breaker / Bypass falló:', { dataBloqueo, dataForce })
      fallos++
    }
  } catch (e) {
    console.error('❌ 5. Breaker error:', e.message)
    fallos++
  }

  // 6. Cero Falsos Positivos en /api/notify (sin credenciales debe responder 503 ok:false, nunca 200 ok:true)
  try {
    const resNotify = await fetch(`${BASE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Test ZeroFP',
        whatsapp: '93764555444',
        codPais: '+54',
        perfil: 'SATURADO',
      }),
    })
    const notifyJson = await resNotify.json()
    if (resNotify.status === 503 && notifyJson.ok === false && notifyJson.delivered === false) {
      console.log('✅ 6. Cero Falsos Positivos (/api/notify sin credenciales -> 503 delivered:false): OK')
    } else if (resNotify.ok && notifyJson.delivered === true) {
      console.log('✅ 6. /api/notify entregó mensaje real de Telegram: OK')
    } else {
      console.error('❌ 6. /api/notify respuesta inesperada:', resNotify.status, notifyJson)
      fallos++
    }
  } catch (e) {
    console.error('❌ 6. /api/notify error:', e.message)
    fallos++
  }

  // 7. Auth Admin + Kanban 6 etapas + Notas + /api/admin/data storageHealth
  let adminCookie = ''
  try {
    const resLogin = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'adminmc' }),
    })
    const cookieHeader = resLogin.headers.get('set-cookie') || ''
    adminCookie = cookieHeader.split(';')[0]

    const resData = await fetch(`${BASE_URL}/api/admin/data`, {
      headers: { Cookie: adminCookie },
    })
    const dataAdmin = await resData.json()

    const resMove = await fetch(`${BASE_URL}/api/admin/pipeline/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        leadId: sessionId,
        nuevaEtapa: 'PROPUESTA_ENVIADA',
        notas: 'Propuesta comercial V3 enviada por WhatsApp',
      }),
    })
    const moveJson = await resMove.json()

    const resLabAuth = await fetch(`${BASE_URL}/api/test-lab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ action: 'get_status' }),
    })

    if (
      resLogin.ok &&
      dataAdmin.storageHealth?.persistent &&
      moveJson.success &&
      moveJson.updatedLead?.etapa_kanban === 'PROPUESTA_ENVIADA' &&
      resLabAuth.ok
    ) {
      console.log('✅ 7. Auth Admin + storageHealth + Kanban PROPUESTA_ENVIADA + /test-lab autenticado: OK')
    } else {
      console.error('❌ 7. Admin/Kanban falló:', {
        login: resLogin.status,
        health: dataAdmin.storageHealth,
        moveJson,
        labAuth: resLabAuth.status,
      })
      fallos++
    }
  } catch (e) {
    console.error('❌ 7. Admin/Kanban error:', e.message)
    fallos++
  }

  // Limpieza estricta de datos de auditoría
  try {
    db.prepare('DELETE FROM diagnostico_outbox WHERE sesion_id = ?').run(sessionId)
    db.prepare('DELETE FROM diagnostico_pipeline_comercial WHERE sesion_id = ?').run(sessionId)
    db.prepare('DELETE FROM diagnostico_sesiones WHERE device_fingerprint = ?').run(testFp)
  } catch {}

  console.log('\n=================================================================')
  if (fallos === 0) {
    console.log('🎉 AUDITORÍA V3 100% EXITOSA: TODOS LOS SISTEMAS VERIFICADOS')
  } else {
    console.error(`⚠️ SE ENCONTRARON ${fallos} FALLOS EN LA AUDITORÍA`)
    process.exit(1)
  }
  console.log('=================================================================')
}

run()
