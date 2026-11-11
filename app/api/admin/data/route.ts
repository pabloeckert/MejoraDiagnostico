import { NextRequest, NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/sheets'
import { sesionValida } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/db/sqlite'
import type { SessionRow, EventoRow } from '@/lib/admin'

export const runtime = 'nodejs'

const SHEET_FUNNEL = 'Funnel'
const SHEET_EVENTOS = 'Eventos'

function mapSession(row: string[]): SessionRow | null {
  const session_id = row[0]?.trim()
  if (!session_id) return null
  return {
    session_id,
    fecha_inicio: row[1] || '',
    nombre: row[2] || '',
    whatsapp: row[3] || '',
    perfil: row[4] || '',
    paso: row[5] || '',
    p1: row[6] || '',
    p2: row[7] || '',
    p3: row[8] || '',
    p4: row[9] || '',
    p5: row[10] || '',
    p6: row[11] || '',
    p7: row[12] || '',
    p8: row[13] || '',
    resultado_visto: row[14] || '',
    abandono_en: row[15] || '',
    ultimo_update: row[16] || '',
    cta_click: row[17] || '',
    visitor_id: row[18] || '',
    origen: row[19] || '',
    dispositivo: row[20] || '',
    tiempos_preguntas: row[21] || '',
    retomado: row[22] || '',
  }
}

function mapEvento(row: string[]): EventoRow | null {
  const session_id = row[2]?.trim()
  if (!session_id) return null
  return {
    timestamp: row[0] || '',
    visitor_id: row[1] || '',
    session_id,
    evento: row[3] || '',
    detalle: row[4] || '',
  }
}

export async function GET(req: NextRequest) {
  try {
    // Protección real: exige la cookie de sesión emitida por /api/admin/login.
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    let sessions: SessionRow[] = []
    let eventos: EventoRow[] = []

    if (
      process.env.GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      try {
        const sheets = await getSheetsClient()
        const [funnelRes, eventosRes] = await Promise.all([
          sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: `${SHEET_FUNNEL}!A2:W`,
          }),
          sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: `${SHEET_EVENTOS}!A2:E`,
          }),
        ])

        sessions = (funnelRes.data.values || [])
          .map(mapSession)
          .filter((s): s is SessionRow => s !== null)

        eventos = (eventosRes.data.values || [])
          .map(mapEvento)
          .filter((e): e is EventoRow => e !== null)
      } catch (sheetsErr) {
        console.warn('admin/data: error leyendo Google Sheets:', sheetsErr)
      }
    }

    // Consultar datos soberanos de Pipeline y Telemetría en Vivo desde SQLite
    let pipelineLeads: any[] = []
    let liveSessions: any[] = []

    try {
      const db = getDatabase()
      pipelineLeads = db.prepare(`
        SELECT p.lead_id, p.sesion_id, p.etapa_kanban, p.sla_limite_atencion,
               p.motivo_descarte, p.notas_seguimiento, p.actualizado_en,
               s.nombre, s.whatsapp, s.arquetipo_calculado,
               s.score_personal, s.score_organizacional, s.score_comercial, s.score_empresarial,
               s.utm_source, s.ref_contacto, s.creado_en
        FROM diagnostico_pipeline_comercial p
        JOIN diagnostico_sesiones s ON p.sesion_id = s.sesion_id
        ORDER BY p.actualizado_en DESC
      `).all()

      liveSessions = db.prepare(`
        SELECT sesion_id, device_fingerprint, estado_funnel, pregunta_maxima,
               utm_source, ref_contacto, user_agent, creado_en, actualizado_en
        FROM diagnostico_sesiones
        WHERE estado_funnel IN ('VISITA_INICIADA', 'EN_CUESTIONARIO')
          AND actualizado_en >= datetime('now', '-30 minutes')
        ORDER BY actualizado_en DESC
      `).all()

      // Si hay sesiones completadas en Sheets que aún no están en la tabla pipeline, insertarlas
      if (sessions.length > 0) {
        const existingIds = new Set(pipelineLeads.map(p => p.sesion_id))
        for (const s of sessions) {
          const esCompletada = Boolean(s.nombre && s.whatsapp && s.perfil)
          if (esCompletada && !existingIds.has(s.session_id)) {
            const leadId = `lead_${s.session_id.slice(0, 12)}`
            const etapa = s.cta_click === 'SÍ' ? 'EN_CONTACTO_WHATSAPP' : 'COMPLETADO_SIN_CONTACTO'
            try {
              db.prepare(`
                INSERT OR IGNORE INTO diagnostico_sesiones (
                  sesion_id, device_fingerprint, nombre, whatsapp, arquetipo_calculado, estado_funnel, creado_en, actualizado_en
                ) VALUES (?, ?, ?, ?, ?, 'COMPLETADO', ?, ?)
              `).run(s.session_id, s.visitor_id || 'sheets_import', s.nombre, s.whatsapp, s.perfil, s.fecha_inicio || new Date().toISOString(), s.ultimo_update || new Date().toISOString())

              db.prepare(`
                INSERT OR IGNORE INTO diagnostico_pipeline_comercial (
                  lead_id, sesion_id, etapa_kanban, sla_limite_atencion, actualizado_en
                ) VALUES (?, ?, ?, datetime('now', '+48 hours'), ?)
              `).run(leadId, s.session_id, etapa, s.ultimo_update || new Date().toISOString())

              pipelineLeads.push({
                lead_id: leadId,
                sesion_id: s.session_id,
                etapa_kanban: etapa,
                sla_limite_atencion: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
                nombre: s.nombre,
                whatsapp: s.whatsapp,
                arquetipo_calculado: s.perfil,
                utm_source: s.origen,
                creado_en: s.fecha_inicio,
                actualizado_en: s.ultimo_update,
              })
            } catch {}
          }
        }
      }
    } catch (dbErr) {
      console.warn('admin/data: SQLite error:', dbErr)
    }

    return NextResponse.json({
      sessions,
      eventos,
      pipeline: pipelineLeads,
      liveSessions,
    })
  } catch (e) {
    console.error('admin/data error:', e)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
