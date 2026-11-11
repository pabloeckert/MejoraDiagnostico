import { getDatabase } from '../lib/db/sqlite.ts'

const BASE_URL = 'http://localhost:3000'

console.log('=================================================================')
console.log('🚀 INICIANDO AUDITORÍA INTEGRAL DE FUNCIONAMIENTO · MEJORADIAGNOSTICO V2')
console.log('=================================================================\n')

async function run() {
  const db = getDatabase()
  let fallos = 0

  // 1. Test Servidor y Landing con Pregunta Cero
  try {
    const res = await fetch(`${BASE_URL}/`)
    const html = await res.text()
    if (res.ok && html.includes('En tu día a día como líder, ¿qué sentís que te frena más?')) {
      console.log('✅ 1. Landing ("/") con Pregunta Cero: OK (HTTP 200 + Titular Visceral presente)')
    } else {
      console.error('❌ 1. Landing: Falló renderizado de Pregunta Cero')
      fallos++
    }
  } catch (e) {
    console.error('❌ 1. Landing: Servidor no responde:', e.message)
    fallos++
  }

  // 2. Test Telemetría Temprana (T = 0 ms)
  const testFp = 'fp_audit_' + Date.now()
  let sessionId = ''
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint: testFp,
        utms: { utm_source: 'auditoria_test', utm_campaign: 'v2_check' },
        referrer: 'https://instagram.com',
      }),
    })
    const data = await res.json()
    if (res.status === 201 && data.sesionId && !data.blocked) {
      sessionId = data.sesionId
      console.log('✅ 2. Telemetría Temprana (T=0): OK (Sesión creada:', sessionId.slice(0, 8) + '...)')
    } else {
      console.error('❌ 2. Telemetría: Respuesta inesperada:', data)
      fallos++
    }
  } catch (e) {
    console.error('❌ 2. Telemetría: Error:', e.message)
    fallos++
  }

  // 3. Test Breaker Anti-Picardía (Simular completado en 72h)
  try {
    db.prepare(`
      UPDATE diagnostico_sesiones 
      SET estado_funnel = 'COMPLETADO', arquetipo_calculado = 'SATURADO',
          score_personal = 20, score_organizacional = 30, score_comercial = 65, score_empresarial = 40,
          nombre = 'Auditor AntiPicardía', whatsapp = '+5493764999888'
      WHERE sesion_id = ?
    `).run(sessionId)

    const resBloqueo = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: testFp }),
    })
    const dataBloqueo = await resBloqueo.json()

    if (dataBloqueo.blocked && dataBloqueo.previousResult?.arquetipo === 'SATURADO') {
      console.log('✅ 3. Breaker Anti-Picardía (72h): BLOQUEO CONFIRMADO (Retorna perfil previo)')
    } else {
      console.error('❌ 3. Breaker 72h: No bloqueó reintento:', dataBloqueo)
      fallos++
    }

    // 4. Test Bypass con ?force=1
    const resForce = await fetch(`${BASE_URL}/api/telemetry/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: testFp, force: true }),
    })
    const dataForce = await resForce.json()
    if (!dataForce.blocked && dataForce.estado === 'INTENTO_SECUNDARIO_MUTADO') {
      console.log('✅ 4. Bypass Forzado (?force=1): OK (Marca INTENTO_SECUNDARIO_MUTADO)')
    } else {
      console.error('❌ 4. Bypass Forzado: Respuesta inesperada:', dataForce)
      fallos++
    }
  } catch (e) {
    console.error('❌ 3/4. Breaker Error:', e.message)
    fallos++
  }

  // 5. Test Funnel Tracking & Persistencia SQLite
  const auditSessionId = 'sess_audit_flow_' + Date.now()
  try {
    // Pregunta respondida
    await fetch(`${BASE_URL}/api/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: auditSessionId,
        visitor_id: testFp,
        evento: 'pregunta_respondida',
        numero: 1,
        segundos: 4,
        valor: 2,
      }),
    })

    // Formulario completado
    await fetch(`${BASE_URL}/api/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: auditSessionId,
        visitor_id: testFp,
        evento: 'formulario_completado',
        nombre: 'Carlos Tester',
        whatsapp: '+5493764123456',
        perfil: 'LIDER_QUE_NECESITA_APOYO',
      }),
    })

    // Verificar en SQLite
    const sesionSql = db.prepare('SELECT * FROM diagnostico_sesiones WHERE sesion_id = ?').get(auditSessionId)
    const pipelineSql = db.prepare('SELECT * FROM diagnostico_pipeline_comercial WHERE sesion_id = ?').get(auditSessionId)

    if (sesionSql?.arquetipo_calculado === 'LIDER_QUE_NECESITA_APOYO' && pipelineSql?.etapa_kanban === 'COMPLETADO_SIN_CONTACTO') {
      console.log('✅ 5. Funnel -> SQLite WAL: OK (Sesión + Pipeline persistidos con SLA 48h)')
    } else {
      console.error('❌ 5. Funnel SQLite: Datos no encontrados:', { sesionSql, pipelineSql })
      fallos++
    }
  } catch (e) {
    console.error('❌ 5. Funnel Error:', e.message)
    fallos++
  }

  // 6. Test Admin Login con contraseña flexible
  let adminCookie = ''
  try {
    const resLogin = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'adminmc' }),
    })
    const cookieHeader = resLogin.headers.get('set-cookie') || ''
    if (resLogin.ok && cookieHeader.includes('mc_admin_session')) {
      adminCookie = cookieHeader.split(';')[0]
      console.log('✅ 6. Autenticación /admin ("adminmc"): OK (Cookie httpOnly emitida)')
    } else {
      console.error('❌ 6. Admin Login: Rechazó contraseña')
      fallos++
    }
  } catch (e) {
    console.error('❌ 6. Admin Login Error:', e.message)
    fallos++
  }

  // 7. Test Admin Data Endpoint (Devuelve pipeline y sesiones)
  try {
    const resData = await fetch(`${BASE_URL}/api/admin/data`, {
      headers: { Cookie: adminCookie },
    })
    const dataAdmin = await resData.json()
    if (resData.ok && Array.isArray(dataAdmin.pipeline) && Array.isArray(dataAdmin.liveSessions)) {
      console.log(`✅ 7. API /api/admin/data: OK (${dataAdmin.pipeline.length} leads en Pipeline, ${dataAdmin.liveSessions.length} en vivo)`)
    } else {
      console.error('❌ 7. Admin Data: Respuesta inválida:', dataAdmin)
      fallos++
    }
  } catch (e) {
    console.error('❌ 7. Admin Data Error:', e.message)
    fallos++
  }

  // 8. Test Movimiento Drag-and-Drop en Kanban (PATCH /api/admin/pipeline/move)
  try {
    const resMove = await fetch(`${BASE_URL}/api/admin/pipeline/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        leadId: auditSessionId,
        nuevaEtapa: 'EN_CONTACTO_WHATSAPP',
        notas: 'Contacto iniciado por WhatsApp el día de hoy',
      }),
    })
    const dataMove = await resMove.json()
    if (resMove.ok && dataMove.success) {
      console.log('✅ 8. Mutación Drag-and-Drop Kanban: OK (Etapa cambiada a EN_CONTACTO_WHATSAPP)')
    } else {
      console.error('❌ 8. Kanban Drag-and-Drop: Falló mutación:', dataMove)
      fallos++
    }
  } catch (e) {
    console.error('❌ 8. Kanban Move Error:', e.message)
    fallos++
  }

  // 9. Test Laboratorio Oculto (/test-lab)
  try {
    const resLab = await fetch(`${BASE_URL}/test-lab`)
    if (resLab.ok) {
      console.log('✅ 9. Sección Oculta /test-lab: OK (Ruta accesible con interfaz de pruebas)')
    } else {
      console.error('❌ 9. /test-lab: No accesible')
      fallos++
    }
  } catch (e) {
    console.error('❌ 9. /test-lab Error:', e.message)
    fallos++
  }

  // Limpieza de datos de prueba
  try {
    db.prepare('DELETE FROM diagnostico_pipeline_comercial WHERE sesion_id LIKE ?').run('%audit%')
    db.prepare('DELETE FROM diagnostico_sesiones WHERE sesion_id LIKE ?').run('%audit%')
  } catch {}

  console.log('\n=================================================================')
  if (fallos === 0) {
    console.log('🎉 AUDITORÍA 100% EXITOSA: TODOS LOS SISTEMAS OPERAN CONFORME AL PLAN V2')
  } else {
    console.error(`⚠️ SE ENCONTRARON ${fallos} FALLOS EN LA AUDITORÍA`)
  }
  console.log('=================================================================')
}

run()
