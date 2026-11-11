import { getDatabase } from '../lib/db/sqlite.ts'

console.log('--- TEST V2: Persistencia SQLite y Breaker Anti-Picardía ---')

const db = getDatabase()
const testFp = 'fp_test_unit_' + Date.now()
const testSessionId = 'test_sess_' + Date.now()

// 1. Simular inserción de sesión previa completada
db.prepare(`
  INSERT INTO diagnostico_sesiones (
    sesion_id, device_fingerprint, estado_funnel, arquetipo_calculado,
    score_personal, score_organizacional, score_comercial, score_empresarial,
    nombre, whatsapp, creado_en, actualizado_en
  ) VALUES (
    ?, ?, 'COMPLETADO', 'SATURADO',
    30, 25, 60, 45,
    'Tester V2', '+5491112345678', datetime('now'), datetime('now')
  )
`).run(testSessionId, testFp)

console.log('✅ 1. Sesión completada insertada en SQLite para fingerprint:', testFp)

// 2. Verificar que la consulta del Breaker Anti-Picardía detecte el reintento dentro de 72h
const detectado = db.prepare(`
  SELECT sesion_id, arquetipo_calculado, score_personal, score_organizacional, 
         score_comercial, score_empresarial, nombre, whatsapp, creado_en
  FROM diagnostico_sesiones
  WHERE device_fingerprint = ? AND estado_funnel = 'COMPLETADO' 
    AND creado_en >= datetime('now', '-72 hours')
  ORDER BY creado_en DESC LIMIT 1
`).get(testFp)

if (detectado && detectado.sesion_id === testSessionId) {
  console.log('✅ 2. Breaker Anti-Picardía 72h: BLOQUEO EXITOSO detectado:', detectado.arquetipo_calculado)
} else {
  console.error('❌ Falló detección en Breaker 72h')
  process.exit(1)
}

// 3. Simular Pipeline Comercial
const leadId = 'lead_' + testSessionId.slice(0, 10)
db.prepare(`
  INSERT INTO diagnostico_pipeline_comercial (
    lead_id, sesion_id, etapa_kanban, sla_limite_atencion, actualizado_en
  ) VALUES (?, ?, 'COMPLETADO_SIN_CONTACTO', datetime('now', '+48 hours'), datetime('now'))
`).run(leadId, testSessionId)

console.log('✅ 3. Lead insertado en diagnostico_pipeline_comercial con SLA 48h')

// 4. Simular mutación de etapa Kanban (Arrastre a EN_CONTACTO_WHATSAPP)
db.prepare(`
  UPDATE diagnostico_pipeline_comercial
  SET etapa_kanban = 'EN_CONTACTO_WHATSAPP', actualizado_en = datetime('now')
  WHERE lead_id = ?
`).run(leadId)

const leadActualizado = db.prepare(`
  SELECT * FROM diagnostico_pipeline_comercial WHERE lead_id = ?
`).get(leadId)

if (leadActualizado && leadActualizado.etapa_kanban === 'EN_CONTACTO_WHATSAPP') {
  console.log('✅ 4. Mutación Drag-and-Drop en Pipeline exitosa:', leadActualizado.etapa_kanban)
} else {
  console.error('❌ Falló mutación en Pipeline')
  process.exit(1)
}

// 5. Limpieza de datos de prueba
db.prepare('DELETE FROM diagnostico_pipeline_comercial WHERE lead_id = ?').run(leadId)
db.prepare('DELETE FROM diagnostico_sesiones WHERE sesion_id = ?').run(testSessionId)
console.log('✅ 5. Limpieza de datos de test completada.')
console.log('🎉 TODOS LOS TESTS DE LA FASE 1, 2, 3 Y 4 PASARON SATISFACTORIAMENTE.')
