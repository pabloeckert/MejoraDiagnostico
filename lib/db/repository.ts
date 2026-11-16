import type { SessionRow, EventoRow } from '@/lib/admin'
import { esEtapaValida, type PipelineStage } from '@/lib/pipeline-fsm'
import { construirBriefComercial, evaluarSenalesIcp } from '@/lib/signal-scoring'
import type { Scores } from '@/lib/scoring'
import {
  getLocalDatabase,
  getSqliteInitError,
  isServerlessEphemeral,
} from './sqlite'
import {
  hasSheetsConfig,
  sheetsClearTestLabData,
  sheetsFindCompleted72h,
  sheetsReadV3State,
  sheetsRecordOutboxV3,
  sheetsUpsertPipelineV3,
  sheetsUpsertSesionV3,
  type SheetPipelineV3,
  type SheetSesionV3,
} from './sheets-store'

export type StorageMode = 'sqlite_y_sheets' | 'sqlite_local' | 'sheets_cloud' | 'degraded'

export interface StorageHealth {
  mode: StorageMode
  persistent: boolean
  sqliteActive: boolean
  sheetsActive: boolean
  detail: string
}

export interface PreviousDiagResult {
  sesionId: string
  arquetipo: string
  nombre: string
  whatsapp: string
  scores: Scores
}

export interface DashboardPipelineLead {
  lead_id: string
  sesion_id: string
  etapa_kanban: PipelineStage | string
  sla_limite_atencion: string
  prioridad_icp?: string
  brief_comercial?: string
  motivo_descarte?: string
  notas_seguimiento?: string
  actualizado_en?: string
  nombre?: string
  whatsapp?: string
  arquetipo_calculado?: string
  pregunta_0_texto?: string
  pregunta_0_dimension?: string
  score_personal?: number
  score_organizacional?: number
  score_comercial?: number
  score_empresarial?: number
  utm_source?: string
  ref_contacto?: string
  creado_en?: string
}

export interface DashboardLiveSession {
  sesion_id: string
  device_fingerprint?: string
  estado_funnel: string
  pregunta_maxima: number
  pregunta_0_texto?: string
  utm_source?: string
  ref_contacto?: string
  user_agent?: string
  creado_en: string
  actualizado_en: string
}

export function getStorageHealth(): StorageHealth {
  const db = getLocalDatabase()
  const sqliteActive = Boolean(db)
  const sheetsActive = hasSheetsConfig()

  if (sqliteActive && sheetsActive) {
    return {
      mode: 'sqlite_y_sheets',
      persistent: true,
      sqliteActive: true,
      sheetsActive: true,
      detail: 'SQLite WAL + Google Sheets V3',
    }
  }
  if (sqliteActive) {
    return {
      mode: 'sqlite_local',
      persistent: true,
      sqliteActive: true,
      sheetsActive: false,
      detail: 'SQLite WAL Soberano (Local)',
    }
  }
  if (sheetsActive) {
    return {
      mode: 'sheets_cloud',
      persistent: true,
      sqliteActive: false,
      sheetsActive: true,
      detail: 'Google Sheets Cloud V3 (Serverless)',
    }
  }

  return {
    mode: 'degraded',
    persistent: false,
    sqliteActive: false,
    sheetsActive: false,
    detail: isServerlessEphemeral()
      ? 'Sin credenciales de Google Sheets ni DB externa en Vercel'
      : getSqliteInitError() || 'Sin motor de persistencia configurado',
  }
}

export async function checkBreaker72h(fingerprint: string): Promise<PreviousDiagResult | null> {
  const db = getLocalDatabase()
  if (db) {
    try {
      const row = db
        .prepare(
          `
          SELECT sesion_id, arquetipo_calculado, score_personal, score_organizacional,
                 score_comercial, score_empresarial, nombre, whatsapp
          FROM diagnostico_sesiones
          WHERE device_fingerprint = ? AND estado_funnel = 'COMPLETADO'
            AND creado_en >= datetime('now', '-72 hours')
          ORDER BY creado_en DESC LIMIT 1
        `
        )
        .get(fingerprint)
      if (row && typeof row.sesion_id === 'string') {
        return {
          sesionId: row.sesion_id,
          arquetipo: String(row.arquetipo_calculado || ''),
          nombre: String(row.nombre || ''),
          whatsapp: String(row.whatsapp || ''),
          scores: {
            personal: Number(row.score_personal || 0),
            organizacional: Number(row.score_organizacional || 0),
            comercial: Number(row.score_comercial || 0),
            empresarial: Number(row.score_empresarial || 0),
          },
        }
      }
    } catch (e) {
      console.warn('[Repo] Error consultando breaker en SQLite:', e)
    }
  }

  if (hasSheetsConfig()) {
    try {
      const prev = await sheetsFindCompleted72h(fingerprint)
      if (prev) {
        return {
          sesionId: prev.sesion_id,
          arquetipo: prev.arquetipo_calculado,
          nombre: prev.nombre,
          whatsapp: prev.whatsapp,
          scores: {
            personal: prev.score_personal,
            organizacional: prev.score_organizacional,
            comercial: prev.score_comercial,
            empresarial: prev.score_empresarial,
          },
        }
      }
    } catch (e) {
      console.warn('[Repo] Error consultando breaker en Sheets:', e)
    }
  }

  return null
}

export async function recordVisit(input: {
  sesionId: string
  fingerprint: string
  estado: 'VISITA_INICIADA' | 'INTENTO_SECUNDARIO_MUTADO'
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  refContacto?: string
  ipHash: string
  userAgent: string
}): Promise<void> {
  const nowIso = new Date().toISOString()
  const db = getLocalDatabase()
  if (db) {
    try {
      db.prepare(
        `
        INSERT INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, utm_source, utm_medium, utm_campaign,
          ref_contacto, ip_hash, user_agent, estado_funnel, creado_en, actualizado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
      ).run(
        input.sesionId,
        input.fingerprint,
        input.utmSource || '',
        input.utmMedium || '',
        input.utmCampaign || '',
        input.refContacto || '',
        input.ipHash,
        input.userAgent.slice(0, 255),
        input.estado
      )
    } catch (e) {
      console.error('[Repo] Error insertando visita en SQLite:', e)
    }
  }

  if (hasSheetsConfig()) {
    await sheetsUpsertSesionV3(input.sesionId, {
      device_fingerprint: input.fingerprint,
      estado_funnel: input.estado,
      utm_source: input.utmSource || '',
      utm_medium: input.utmMedium || '',
      utm_campaign: input.utmCampaign || '',
      ref_contacto: input.refContacto || '',
      user_agent: input.userAgent.slice(0, 255),
      creado_en: nowIso,
      actualizado_en: nowIso,
    }).catch((e) => console.warn('[Repo] Error guardando visita en Sheets V3:', e))
  }
}

export async function recordProgress(input: {
  sessionId: string
  visitorId?: string
  evento: string
  numero?: number
  segundos?: number
  valor?: number
  nombre?: string
  pregunta0Id?: string
  pregunta0Texto?: string
  pregunta0Dimension?: string
  utmSource?: string
}): Promise<void> {
  const db = getLocalDatabase()
  const nowIso = new Date().toISOString()

  if (db) {
    try {
      db.prepare(
        `
        INSERT OR IGNORE INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, estado_funnel, creado_en, actualizado_en
        ) VALUES (?, ?, 'VISITA_INICIADA', datetime('now'), datetime('now'))
      `
      ).run(input.sessionId, input.visitorId || 'anonymous')

      if (input.evento === 'pregunta_0_respondida') {
        db.prepare(
          `
          UPDATE diagnostico_sesiones
          SET pregunta_0_id = ?, pregunta_0_texto = ?, pregunta_0_dimension = ?,
              estado_funnel = 'EN_CUESTIONARIO', actualizado_en = datetime('now')
          WHERE sesion_id = ?
        `
        ).run(
          input.pregunta0Id || '',
          input.pregunta0Texto || '',
          input.pregunta0Dimension || '',
          input.sessionId
        )
      } else if (input.evento === 'pregunta_respondida' && typeof input.numero === 'number') {
        db.prepare(
          `
          INSERT OR REPLACE INTO diagnostico_respuestas (
            respuesta_id, sesion_id, pregunta_id, opcion_seleccionada, tiempo_segundos, creado_en
          ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        `
        ).run(
          `${input.sessionId}_q${input.numero}`,
          input.sessionId,
          input.numero,
          String(input.valor ?? ''),
          input.segundos ?? 0
        )

        db.prepare(
          `
          UPDATE diagnostico_sesiones
          SET pregunta_maxima = MAX(pregunta_maxima, ?),
              estado_funnel = CASE WHEN estado_funnel = 'COMPLETADO' THEN 'COMPLETADO' ELSE 'EN_CUESTIONARIO' END,
              actualizado_en = datetime('now')
          WHERE sesion_id = ?
        `
        ).run(input.numero, input.sessionId)
      } else if (input.evento === 'abandono') {
        db.prepare(
          `
          UPDATE diagnostico_sesiones
          SET estado_funnel = 'ABANDONADO', actualizado_en = datetime('now')
          WHERE sesion_id = ? AND estado_funnel != 'COMPLETADO'
        `
        ).run(input.sessionId)
      } else if (input.evento === 'nombre_ingresado' && input.nombre) {
        db.prepare(
          `
          UPDATE diagnostico_sesiones
          SET nombre = ?, actualizado_en = datetime('now')
          WHERE sesion_id = ?
        `
        ).run(input.nombre, input.sessionId)
      }
    } catch (e) {
      console.warn('[Repo] Error guardando progreso SQLite:', e)
    }
  }

  if (hasSheetsConfig()) {
    const patch: Partial<SheetSesionV3> = {
      device_fingerprint: input.visitorId,
      utm_source: input.utmSource,
      actualizado_en: nowIso,
    }
    if (input.evento === 'pregunta_0_respondida') {
      patch.estado_funnel = 'EN_CUESTIONARIO'
      patch.pregunta_0_id = input.pregunta0Id || ''
      patch.pregunta_0_texto = input.pregunta0Texto || ''
      patch.pregunta_0_dimension = input.pregunta0Dimension || ''
    } else if (input.evento === 'pregunta_respondida' && typeof input.numero === 'number') {
      patch.estado_funnel = 'EN_CUESTIONARIO'
      patch.pregunta_maxima = input.numero
    } else if (input.evento === 'abandono') {
      patch.estado_funnel = 'ABANDONADO'
    } else if (input.evento === 'nombre_ingresado' && input.nombre) {
      patch.nombre = input.nombre
    }

    await sheetsUpsertSesionV3(input.sessionId, patch).catch((e) =>
      console.warn('[Repo] Error guardando progreso en Sheets V3:', e)
    )
  }
}

export interface CompleteDiagnosticoInput {
  sessionId: string
  visitorId?: string
  nombre: string
  whatsapp: string
  perfil: string
  scores: Scores
  respuestas?: number[]
  tiempos?: number[]
  posicion?: string
  pregunta0Id?: string
  pregunta0Texto?: string
  pregunta0Dimension?: string
  utmSource?: string
  refContacto?: string
}

export async function completeDiagnostico(
  input: CompleteDiagnosticoInput
): Promise<{ leadId: string; prioridadIcp: string; briefComercial: string }> {
  const senal = evaluarSenalesIcp(input.scores, input.tiempos)
  const briefComercial = construirBriefComercial({
    nombre: input.nombre,
    perfilKey: input.perfil,
    scores: input.scores,
    pregunta0Texto: input.pregunta0Texto,
    pregunta0Dimension: input.pregunta0Dimension,
    posicion: input.posicion,
    tiempos: input.tiempos,
    utmSource: input.utmSource,
  })
  const leadId = `lead_${input.sessionId.slice(0, 12)}`
  const nowIso = new Date().toISOString()
  const slaLimiteIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  const tiemposJson = Array.isArray(input.tiempos) ? JSON.stringify(input.tiempos) : ''

  const db = getLocalDatabase()
  if (db) {
    try {
      db.prepare(
        `
        INSERT OR IGNORE INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, estado_funnel, creado_en, actualizado_en
        ) VALUES (?, ?, 'COMPLETADO', datetime('now'), datetime('now'))
      `
      ).run(input.sessionId, input.visitorId || 'anonymous')

      db.prepare(
        `
        UPDATE diagnostico_sesiones
        SET nombre = COALESCE(NULLIF(?, ''), nombre),
            whatsapp = COALESCE(NULLIF(?, ''), whatsapp),
            arquetipo_calculado = ?,
            score_personal = ?,
            score_organizacional = ?,
            score_comercial = ?,
            score_empresarial = ?,
            pregunta_0_id = COALESCE(NULLIF(?, ''), pregunta_0_id),
            pregunta_0_texto = COALESCE(NULLIF(?, ''), pregunta_0_texto),
            pregunta_0_dimension = COALESCE(NULLIF(?, ''), pregunta_0_dimension),
            posicion_rol = COALESCE(NULLIF(?, ''), posicion_rol),
            prioridad_icp = ?,
            tiempos_json = COALESCE(NULLIF(?, ''), tiempos_json),
            pregunta_maxima = 8,
            estado_funnel = 'COMPLETADO',
            actualizado_en = datetime('now')
        WHERE sesion_id = ?
      `
      ).run(
        input.nombre,
        input.whatsapp,
        input.perfil,
        input.scores.personal,
        input.scores.organizacional,
        input.scores.comercial,
        input.scores.empresarial,
        input.pregunta0Id || '',
        input.pregunta0Texto || '',
        input.pregunta0Dimension || '',
        input.posicion || '',
        senal.prioridad,
        tiemposJson,
        input.sessionId
      )

      db.prepare(
        `
        INSERT INTO diagnostico_pipeline_comercial (
          lead_id, sesion_id, etapa_kanban, sla_limite_atencion, prioridad_icp, brief_comercial, actualizado_en
        ) VALUES (?, ?, 'COMPLETADO_SIN_CONTACTO', datetime('now', '+48 hours'), ?, ?, datetime('now'))
        ON CONFLICT(sesion_id) DO UPDATE SET
          prioridad_icp = excluded.prioridad_icp,
          brief_comercial = excluded.brief_comercial,
          actualizado_en = datetime('now')
      `
      ).run(leadId, input.sessionId, senal.prioridad, briefComercial)
    } catch (e) {
      console.error('[Repo] Error completando diagnóstico SQLite:', e)
    }
  }

  if (hasSheetsConfig()) {
    await Promise.all([
      sheetsUpsertSesionV3(input.sessionId, {
        device_fingerprint: input.visitorId || 'anonymous',
        estado_funnel: 'COMPLETADO',
        pregunta_maxima: 8,
        pregunta_0_id: input.pregunta0Id || '',
        pregunta_0_texto: input.pregunta0Texto || '',
        pregunta_0_dimension: input.pregunta0Dimension || '',
        posicion_rol: input.posicion || '',
        arquetipo_calculado: input.perfil,
        score_personal: input.scores.personal,
        score_organizacional: input.scores.organizacional,
        score_comercial: input.scores.comercial,
        score_empresarial: input.scores.empresarial,
        prioridad_icp: senal.prioridad,
        nombre: input.nombre,
        whatsapp: input.whatsapp,
        utm_source: input.utmSource || '',
        ref_contacto: input.refContacto || '',
        tiempos_json: tiemposJson,
        actualizado_en: nowIso,
      }),
      sheetsUpsertPipelineV3(leadId, {
        lead_id: leadId,
        sesion_id: input.sessionId,
        etapa_kanban: 'COMPLETADO_SIN_CONTACTO',
        sla_limite_atencion: slaLimiteIso,
        prioridad_icp: senal.prioridad,
        brief_comercial: briefComercial,
        actualizado_en: nowIso,
      }),
    ]).catch((e) => console.warn('[Repo] Error completando en Sheets V3:', e))
  }

  return { leadId, prioridadIcp: senal.prioridad, briefComercial }
}

export async function movePipelineLead(input: {
  leadId: string
  nuevaEtapa: PipelineStage
  notas?: string
  motivoDescarte?: string
}): Promise<{ ok: boolean; updatedLead?: DashboardPipelineLead; error?: string }> {
  if (!esEtapaValida(input.nuevaEtapa)) {
    return { ok: false, error: 'etapa_invalida' }
  }

  const nowIso = new Date().toISOString()
  let updatedLead: DashboardPipelineLead | undefined

  const db = getLocalDatabase()
  if (db) {
    const result = db
      .prepare(
        `
        UPDATE diagnostico_pipeline_comercial
        SET etapa_kanban = ?,
            notas_seguimiento = CASE WHEN ? IS NOT NULL THEN ? ELSE notas_seguimiento END,
            motivo_descarte = CASE WHEN ? IS NOT NULL THEN ? ELSE motivo_descarte END,
            actualizado_en = datetime('now')
        WHERE lead_id = ? OR sesion_id = ?
      `
      )
      .run(
        input.nuevaEtapa,
        input.notas ?? null,
        input.notas ?? null,
        input.motivoDescarte ?? null,
        input.motivoDescarte ?? null,
        input.leadId,
        input.leadId
      )

    if (!result.changes || Number(result.changes) === 0) {
      db.prepare(
        `
        INSERT INTO diagnostico_pipeline_comercial (
          lead_id, sesion_id, etapa_kanban, sla_limite_atencion, notas_seguimiento, motivo_descarte, actualizado_en
        ) VALUES (?, ?, ?, datetime('now', '+48 hours'), ?, ?, datetime('now'))
      `
      ).run(
        input.leadId,
        input.leadId,
        input.nuevaEtapa,
        input.notas ?? null,
        input.motivoDescarte ?? null
      )
    }

    const row = db
      .prepare(
        `
        SELECT p.*, s.nombre, s.whatsapp, s.arquetipo_calculado,
               s.score_personal, s.score_organizacional, s.score_comercial, s.score_empresarial,
               s.pregunta_0_texto, s.pregunta_0_dimension
        FROM diagnostico_pipeline_comercial p
        LEFT JOIN diagnostico_sesiones s ON p.sesion_id = s.sesion_id
        WHERE p.lead_id = ? OR p.sesion_id = ?
        LIMIT 1
      `
      )
      .get(input.leadId, input.leadId)

    if (row) {
      updatedLead = {
        lead_id: String(row.lead_id || input.leadId),
        sesion_id: String(row.sesion_id || input.leadId),
        etapa_kanban: String(row.etapa_kanban || input.nuevaEtapa),
        sla_limite_atencion: String(row.sla_limite_atencion || ''),
        prioridad_icp: row.prioridad_icp ? String(row.prioridad_icp) : undefined,
        brief_comercial: row.brief_comercial ? String(row.brief_comercial) : undefined,
        notas_seguimiento: row.notas_seguimiento ? String(row.notas_seguimiento) : undefined,
        motivo_descarte: row.motivo_descarte ? String(row.motivo_descarte) : undefined,
        actualizado_en: String(row.actualizado_en || nowIso),
        nombre: row.nombre ? String(row.nombre) : undefined,
        whatsapp: row.whatsapp ? String(row.whatsapp) : undefined,
        arquetipo_calculado: row.arquetipo_calculado
          ? String(row.arquetipo_calculado)
          : undefined,
        pregunta_0_texto: row.pregunta_0_texto ? String(row.pregunta_0_texto) : undefined,
      }
    }
  }

  if (hasSheetsConfig()) {
    const patch: Partial<SheetPipelineV3> = {
      etapa_kanban: input.nuevaEtapa,
      actualizado_en: nowIso,
    }
    if (input.notas !== undefined) patch.notas_seguimiento = input.notas
    if (input.motivoDescarte !== undefined) patch.motivo_descarte = input.motivoDescarte

    const saved = await sheetsUpsertPipelineV3(input.leadId, patch)
    if (saved && !updatedLead) {
      updatedLead = saved
    }
  }

  if (!db && !hasSheetsConfig()) {
    return { ok: false, error: 'no_persistent_storage' }
  }

  return { ok: true, updatedLead }
}

function mapLegacySession(row: string[]): SessionRow | null {
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

function mapLegacyEvento(row: string[]): EventoRow | null {
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

export async function getAdminDashboardData(): Promise<{
  sessions: SessionRow[]
  eventos: EventoRow[]
  pipeline: DashboardPipelineLead[]
  liveSessions: DashboardLiveSession[]
  storageHealth: StorageHealth
}> {
  const storageHealth = getStorageHealth()
  let sessions: SessionRow[] = []
  let eventos: EventoRow[] = []
  const pipelineMap = new Map<string, DashboardPipelineLead>()
  const liveMap = new Map<string, DashboardLiveSession>()

  // 1. Leer capa persistente local (si corre en Node local)
  const db = getLocalDatabase()
  if (db) {
    try {
      const pipeRows = db
        .prepare(
          `
          SELECT p.lead_id, p.sesion_id, p.etapa_kanban, p.sla_limite_atencion,
                 p.prioridad_icp, p.brief_comercial, p.motivo_descarte, p.notas_seguimiento, p.actualizado_en,
                 s.nombre, s.whatsapp, s.arquetipo_calculado, s.pregunta_0_texto, s.pregunta_0_dimension,
                 s.score_personal, s.score_organizacional, s.score_comercial, s.score_empresarial,
                 s.utm_source, s.ref_contacto, s.creado_en
          FROM diagnostico_pipeline_comercial p
          JOIN diagnostico_sesiones s ON p.sesion_id = s.sesion_id
          ORDER BY p.actualizado_en DESC
        `
        )
        .all()

      for (const r of pipeRows) {
        const sid = String(r.sesion_id)
        pipelineMap.set(sid, {
          lead_id: String(r.lead_id),
          sesion_id: sid,
          etapa_kanban: String(r.etapa_kanban),
          sla_limite_atencion: String(r.sla_limite_atencion || ''),
          prioridad_icp: r.prioridad_icp ? String(r.prioridad_icp) : undefined,
          brief_comercial: r.brief_comercial ? String(r.brief_comercial) : undefined,
          motivo_descarte: r.motivo_descarte ? String(r.motivo_descarte) : undefined,
          notas_seguimiento: r.notas_seguimiento ? String(r.notas_seguimiento) : undefined,
          actualizado_en: String(r.actualizado_en || ''),
          nombre: r.nombre ? String(r.nombre) : undefined,
          whatsapp: r.whatsapp ? String(r.whatsapp) : undefined,
          arquetipo_calculado: r.arquetipo_calculado
            ? String(r.arquetipo_calculado)
            : undefined,
          pregunta_0_texto: r.pregunta_0_texto ? String(r.pregunta_0_texto) : undefined,
          pregunta_0_dimension: r.pregunta_0_dimension
            ? String(r.pregunta_0_dimension)
            : undefined,
          score_personal: Number(r.score_personal || 0),
          score_organizacional: Number(r.score_organizacional || 0),
          score_comercial: Number(r.score_comercial || 0),
          score_empresarial: Number(r.score_empresarial || 0),
          utm_source: r.utm_source ? String(r.utm_source) : undefined,
          ref_contacto: r.ref_contacto ? String(r.ref_contacto) : undefined,
          creado_en: r.creado_en ? String(r.creado_en) : undefined,
        })
      }

      const liveRows = db
        .prepare(
          `
          SELECT sesion_id, device_fingerprint, estado_funnel, pregunta_maxima,
                 pregunta_0_texto, utm_source, ref_contacto, user_agent, creado_en, actualizado_en
          FROM diagnostico_sesiones
          WHERE estado_funnel IN ('VISITA_INICIADA', 'EN_CUESTIONARIO')
            AND actualizado_en >= datetime('now', '-30 minutes')
          ORDER BY actualizado_en DESC
        `
        )
        .all()

      for (const r of liveRows) {
        const sid = String(r.sesion_id)
        liveMap.set(sid, {
          sesion_id: sid,
          device_fingerprint: r.device_fingerprint ? String(r.device_fingerprint) : undefined,
          estado_funnel: String(r.estado_funnel),
          pregunta_maxima: Number(r.pregunta_maxima || 0),
          pregunta_0_texto: r.pregunta_0_texto ? String(r.pregunta_0_texto) : undefined,
          utm_source: r.utm_source ? String(r.utm_source) : undefined,
          ref_contacto: r.ref_contacto ? String(r.ref_contacto) : undefined,
          user_agent: r.user_agent ? String(r.user_agent) : undefined,
          creado_en: String(r.creado_en),
          actualizado_en: String(r.actualizado_en),
        })
      }
    } catch (e) {
      console.warn('[Repo] Error leyendo admin data SQLite:', e)
    }
  }

  // 2. Leer Google Sheets (Funnel, Eventos y V3 Cloud Store)
  if (hasSheetsConfig()) {
    try {
      const sheetState = await sheetsReadV3State()
      sessions = sheetState.funnelRows
        .map(mapLegacySession)
        .filter((s): s is SessionRow => s !== null)
      eventos = sheetState.eventosRows
        .map(mapLegacyEvento)
        .filter((e): e is EventoRow => e !== null)

      const sesionV3ById = new Map(sheetState.sesiones.map((s) => [s.sesion_id, s]))

      // Incorporar PipelineV3 en nube (clave para Vercel Serverless)
      for (const p of sheetState.pipeline) {
        if (!pipelineMap.has(p.sesion_id)) {
          const ses = sesionV3ById.get(p.sesion_id)
          pipelineMap.set(p.sesion_id, {
            lead_id: p.lead_id,
            sesion_id: p.sesion_id,
            etapa_kanban: p.etapa_kanban,
            sla_limite_atencion: p.sla_limite_atencion,
            prioridad_icp: p.prioridad_icp || ses?.prioridad_icp,
            brief_comercial: p.brief_comercial,
            notas_seguimiento: p.notas_seguimiento,
            motivo_descarte: p.motivo_descarte,
            actualizado_en: p.actualizado_en,
            nombre: ses?.nombre,
            whatsapp: ses?.whatsapp,
            arquetipo_calculado: ses?.arquetipo_calculado,
            pregunta_0_texto: ses?.pregunta_0_texto,
            pregunta_0_dimension: ses?.pregunta_0_dimension,
            score_personal: ses?.score_personal,
            score_organizacional: ses?.score_organizacional,
            score_comercial: ses?.score_comercial,
            score_empresarial: ses?.score_empresarial,
            utm_source: ses?.utm_source,
            ref_contacto: ses?.ref_contacto,
            creado_en: ses?.creado_en,
          })
        }
      }

      // Backfill automático de sesiones completadas en Funnel histórico que no estén aún en Pipeline
      for (const s of sessions) {
        const esCompleta = Boolean(s.nombre && s.whatsapp && s.perfil)
        if (esCompleta && !pipelineMap.has(s.session_id)) {
          pipelineMap.set(s.session_id, {
            lead_id: `lead_${s.session_id.slice(0, 12)}`,
            sesion_id: s.session_id,
            etapa_kanban:
              s.cta_click === 'SÍ' ? 'EN_CONTACTO_WHATSAPP' : 'COMPLETADO_SIN_CONTACTO',
            sla_limite_atencion: new Date(
              (Date.parse(s.ultimo_update || s.fecha_inicio) || Date.now()) + 48 * 3600 * 1000
            ).toISOString(),
            nombre: s.nombre,
            whatsapp: s.whatsapp,
            arquetipo_calculado: s.perfil,
            utm_source: s.origen,
            creado_en: s.fecha_inicio,
            actualizado_en: s.ultimo_update,
          })
        }
      }

      // Sesiones activas en vivo últimos 30 min desde SesionesV3
      const hace30Min = Date.now() - 30 * 60 * 1000
      for (const s of sheetState.sesiones) {
        if (
          (s.estado_funnel === 'VISITA_INICIADA' || s.estado_funnel === 'EN_CUESTIONARIO') &&
          !liveMap.has(s.sesion_id)
        ) {
          const ts = Date.parse(s.actualizado_en || s.creado_en)
          if (!Number.isNaN(ts) && ts >= hace30Min) {
            liveMap.set(s.sesion_id, {
              sesion_id: s.sesion_id,
              device_fingerprint: s.device_fingerprint,
              estado_funnel: s.estado_funnel,
              pregunta_maxima: s.pregunta_maxima,
              pregunta_0_texto: s.pregunta_0_texto,
              utm_source: s.utm_source,
              ref_contacto: s.ref_contacto,
              user_agent: s.user_agent,
              creado_en: s.creado_en,
              actualizado_en: s.actualizado_en,
            })
          }
        }
      }
    } catch (e) {
      console.warn('[Repo] Error leyendo Google Sheets:', e)
    }
  }

  return {
    sessions,
    eventos,
    pipeline: Array.from(pipelineMap.values()),
    liveSessions: Array.from(liveMap.values()),
    storageHealth,
  }
}

export async function recordOutboxEntry(entry: {
  idempotencyKey: string
  sesionId: string
  destino: string
  payloadJson: string
  estado: 'PENDIENTE' | 'ENVIADO' | 'OMITIDO_SIN_CREDENCIAL' | 'FALLIDO'
  intentos: number
  ultimoError?: string
}): Promise<void> {
  const db = getLocalDatabase()
  if (db) {
    try {
      db.prepare(
        `
        INSERT INTO diagnostico_outbox (
          idempotency_key, sesion_id, destino, payload_json, estado, intentos, ultimo_error, creado_en, actualizado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(idempotency_key) DO UPDATE SET
          estado = excluded.estado,
          intentos = excluded.intentos,
          ultimo_error = excluded.ultimo_error,
          actualizado_en = datetime('now')
      `
      ).run(
        entry.idempotencyKey,
        entry.sesionId,
        entry.destino,
        entry.payloadJson,
        entry.estado,
        entry.intentos,
        entry.ultimoError || null
      )
    } catch (e) {
      console.warn('[Repo Outbox] Error SQLite:', e)
    }
  }

  if (hasSheetsConfig()) {
    await sheetsRecordOutboxV3(entry).catch((e) =>
      console.warn('[Repo Outbox] Error Sheets:', e)
    )
  }
}

export async function clearAllTestLabData(): Promise<void> {
  const db = getLocalDatabase()
  if (db) {
    db.prepare(
      `
      DELETE FROM diagnostico_pipeline_comercial
      WHERE lead_id LIKE 'lead_test_%'
         OR lead_id LIKE 'lead_vencido_%'
         OR lead_id LIKE 'lead_urgente_%'
         OR lead_id LIKE 'lead_normal_%'
         OR lead_id LIKE 'lead_reunion_%'
         OR lead_id LIKE 'lead_cerrado_%'
    `
    ).run()
    db.prepare(
      `
      DELETE FROM diagnostico_sesiones
      WHERE sesion_id LIKE 'sess_test_%'
         OR sesion_id LIKE 'sess_vencido_%'
         OR sesion_id LIKE 'sess_urgente_%'
         OR sesion_id LIKE 'sess_normal_%'
         OR sesion_id LIKE 'sess_reunion_%'
         OR sesion_id LIKE 'sess_cerrado_%'
         OR sesion_id LIKE 'sess_live_%'
    `
    ).run()
  }

  if (hasSheetsConfig()) {
    await sheetsClearTestLabData()
  }
}
