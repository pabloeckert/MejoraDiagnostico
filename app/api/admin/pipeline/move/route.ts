import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sesionValida } from '@/lib/admin-auth'
import { getDatabase } from '@/lib/db/sqlite'

export const runtime = 'nodejs'

const MoveSchema = z.object({
  leadId: z.string().min(1),
  nuevaEtapa: z.enum([
    'COMPLETADO_SIN_CONTACTO',
    'EN_CONTACTO_WHATSAPP',
    'REUNION_AGENDADA',
    'PROPUESTA_ENVIADA',
    'CERRADO_GANADO',
    'DESCARTADO',
  ]),
  notas: z.string().max(1000).optional(),
  motivoDescarte: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = MoveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'payload_invalido', details: parsed.error.issues }, { status: 400 })
    }

    const { leadId, nuevaEtapa, notas, motivoDescarte } = parsed.data
    const db = getDatabase()

    try {
      const stmt = db.prepare(`
        UPDATE diagnostico_pipeline_comercial
        SET etapa_kanban = ?, 
            notas_seguimiento = COALESCE(?, notas_seguimiento),
            motivo_descarte = COALESCE(?, motivo_descarte),
            actualizado_en = datetime('now')
        WHERE lead_id = ? OR sesion_id = ?
      `)
      const result = stmt.run(nuevaEtapa, notas || null, motivoDescarte || null, leadId, leadId)

      // Si no existía aún en el pipeline, intentar insertarlo
      if (result.changes === 0) {
        db.prepare(`
          INSERT INTO diagnostico_pipeline_comercial (
            lead_id, sesion_id, etapa_kanban, sla_limite_atencion, notas_seguimiento, actualizado_en
          ) VALUES (?, ?, ?, datetime('now', '+48 hours'), ?, datetime('now'))
        `).run(leadId, leadId, nuevaEtapa, notas || null)
      }

      // Obtener el lead actualizado
      const updated = db.prepare(`
        SELECT p.*, s.nombre, s.whatsapp, s.arquetipo_calculado
        FROM diagnostico_pipeline_comercial p
        LEFT JOIN diagnostico_sesiones s ON p.sesion_id = s.sesion_id
        WHERE p.lead_id = ? OR p.sesion_id = ?
        LIMIT 1
      `).get(leadId, leadId)

      return NextResponse.json({
        success: true,
        updatedLead: updated,
      })
    } catch (dbErr) {
      console.error('[Pipeline Move] Error SQLite:', dbErr)
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
    }
  } catch (error) {
    console.error('[Pipeline Move] Error inesperado:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
