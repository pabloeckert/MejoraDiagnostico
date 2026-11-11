import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/sqlite'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action, fingerprint } = body
    const db = getDatabase()

    if (action === 'simulate_completed_72h') {
      const targetFp = fingerprint || 'fp_test_device'
      const sessionId = 'sess_test_72h_' + Date.now()
      const leadId = 'lead_test_' + Date.now()

      // Insertar sesión completada hace 2 horas para este fingerprint
      db.prepare(`
        INSERT INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, estado_funnel, arquetipo_calculado,
          score_personal, score_organizacional, score_comercial, score_empresarial,
          nombre, whatsapp, creado_en, actualizado_en
        ) VALUES (
          ?, ?, 'COMPLETADO', 'SATURADO',
          25, 30, 65, 40,
          'Test Empresario 72h', '+5493764000111',
          datetime('now', '-2 hours'), datetime('now', '-2 hours')
        )
      `).run(sessionId, targetFp)

      // Insertar en pipeline con SLA restante
      db.prepare(`
        INSERT INTO diagnostico_pipeline_comercial (
          lead_id, sesion_id, etapa_kanban, sla_limite_atencion, actualizado_en
        ) VALUES (?, ?, 'COMPLETADO_SIN_CONTACTO', datetime('now', '+46 hours'), datetime('now'))
      `).run(leadId, sessionId)

      return NextResponse.json({
        ok: true,
        message: 'Sesión completada simulada con éxito para el fingerprint proporcionado.',
        sessionId,
        fingerprint: targetFp,
      })
    }

    if (action === 'seed_kanban_leads') {
      const ts = Date.now()
      const sampleLeads = [
        {
          sid: `sess_vencido_${ts}`,
          lid: `lead_vencido_${ts}`,
          nombre: 'Martín Gómez (Metalúrgica)',
          wa: '+5491155551234',
          arq: 'SATURADO',
          scores: [20, 25, 60, 35],
          etapa: 'COMPLETADO_SIN_CONTACTO',
          sla: "datetime('now', '-2 hours')", // Vencido (Rojo parpadeante)
        },
        {
          sid: `sess_urgente_${ts}`,
          lid: `lead_urgente_${ts}`,
          nombre: 'Lic. Mariana Ramos (Clínica)',
          wa: '+5491144445678',
          arq: 'LIDER_QUE_NECESITA_APOYO',
          scores: [30, 20, 50, 45],
          etapa: 'COMPLETADO_SIN_CONTACTO',
          sla: "datetime('now', '+6 hours')", // Urgente <8h (Rojo / Amarillo)
        },
        {
          sid: `sess_normal_${ts}`,
          lid: `lead_normal_${ts}`,
          nombre: 'Carlos Rossi (Distribuidora)',
          wa: '+5493764889900',
          arq: 'AREA_COMERCIAL_SIN_RESULTADOS',
          scores: [50, 60, 20, 40],
          etapa: 'EN_CONTACTO_WHATSAPP',
          sla: "datetime('now', '+38 hours')", // Normal (Verde)
        },
        {
          sid: `sess_reunion_${ts}`,
          lid: `lead_reunion_${ts}`,
          nombre: 'Dra. Laura Paz (Estudio Contable)',
          wa: '+5493764112233',
          arq: 'EQUIPO_DESALINEADO',
          scores: [60, 25, 55, 45],
          etapa: 'REUNION_AGENDADA',
          sla: "datetime('now', '+42 hours')",
        },
        {
          sid: `sess_cerrado_${ts}`,
          lid: `lead_cerrado_${ts}`,
          nombre: 'Ing. Roberto Silva (Agropecuaria)',
          wa: '+5491166667788',
          arq: 'SIN_PROFESIONALIZAR_LA_EMPRESA',
          scores: [25, 20, 30, 25],
          etapa: 'CERRADO_GANADO',
          sla: "datetime('now', '+10 hours')",
        },
      ]

      for (const item of sampleLeads) {
        db.prepare(`
          INSERT OR REPLACE INTO diagnostico_sesiones (
            sesion_id, device_fingerprint, estado_funnel, arquetipo_calculado,
            score_personal, score_organizacional, score_comercial, score_empresarial,
            nombre, whatsapp, creado_en, actualizado_en
          ) VALUES (?, ?, 'COMPLETADO', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          item.sid,
          'fp_sample_' + item.sid,
          item.arq,
          item.scores[0],
          item.scores[1],
          item.scores[2],
          item.scores[3],
          item.nombre,
          item.wa
        )

        db.prepare(`
          INSERT OR REPLACE INTO diagnostico_pipeline_comercial (
            lead_id, sesion_id, etapa_kanban, sla_limite_atencion, actualizado_en
          ) VALUES (?, ?, ?, ${item.sla}, datetime('now'))
        `).run(item.lid, item.sid, item.etapa)
      }

      // Crear también 1 sesión activa para columna "EN VIVO"
      db.prepare(`
        INSERT OR REPLACE INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, estado_funnel, pregunta_maxima,
          utm_source, ref_contacto, creado_en, actualizado_en
        ) VALUES (
          ?, 'fp_live_user', 'EN_CUESTIONARIO', 5,
          'instagram_ad', 'wa_campana_pymes', datetime('now', '-3 minutes'), datetime('now', '-1 minute')
        )
      `).run(`sess_live_${ts}`)

      return NextResponse.json({
        ok: true,
        message: '5 leads en distintas etapas y 1 sesión en vivo inyectadas exitosamente.',
      })
    }

    if (action === 'clear_test_data') {
      db.prepare("DELETE FROM diagnostico_pipeline_comercial WHERE lead_id LIKE 'lead_test_%' OR lead_id LIKE 'lead_%'").run()
      db.prepare("DELETE FROM diagnostico_sesiones WHERE sesion_id LIKE 'sess_test_%' OR sesion_id LIKE 'sess_%'").run()
      return NextResponse.json({ ok: true, message: 'Datos de prueba eliminados de SQLite.' })
    }

    if (action === 'get_status') {
      const totalSesiones = db.prepare('SELECT COUNT(*) as c FROM diagnostico_sesiones').get()?.c || 0
      const totalPipeline = db.prepare('SELECT COUNT(*) as c FROM diagnostico_pipeline_comercial').get()?.c || 0
      const ultimasSesiones = db.prepare(`
        SELECT sesion_id, device_fingerprint, estado_funnel, arquetipo_calculado, nombre, creado_en
        FROM diagnostico_sesiones ORDER BY creado_en DESC LIMIT 5
      `).all()

      return NextResponse.json({
        ok: true,
        totalSesiones,
        totalPipeline,
        ultimasSesiones,
      })
    }

    return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Test Lab API] Error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
