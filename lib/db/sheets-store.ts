import type { sheets_v4 } from 'googleapis'
import { getSheetsClient } from '@/lib/sheets'

export const TAB_SESIONES_V3 = 'SesionesV3'
export const TAB_PIPELINE_V3 = 'PipelineV3'
export const TAB_OUTBOX_V3 = 'OutboxV3'
export const TAB_FUNNEL = 'Funnel'
export const TAB_EVENTOS = 'Eventos'

const HEADERS_SESIONES_V3 = [
  'sesion_id',
  'device_fingerprint',
  'estado_funnel',
  'pregunta_0_id',
  'pregunta_0_texto',
  'pregunta_0_dimension',
  'pregunta_maxima',
  'posicion_rol',
  'arquetipo_calculado',
  'score_personal',
  'score_organizacional',
  'score_comercial',
  'score_empresarial',
  'prioridad_icp',
  'nombre',
  'whatsapp',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'ref_contacto',
  'user_agent',
  'tiempos_json',
  'creado_en',
  'actualizado_en',
]

const HEADERS_PIPELINE_V3 = [
  'lead_id',
  'sesion_id',
  'etapa_kanban',
  'sla_limite_atencion',
  'prioridad_icp',
  'brief_comercial',
  'notas_seguimiento',
  'motivo_descarte',
  'actualizado_en',
]

const HEADERS_OUTBOX_V3 = [
  'idempotency_key',
  'sesion_id',
  'destino',
  'estado',
  'intentos',
  'ultimo_error',
  'actualizado_en',
]

export interface SheetSesionV3 {
  sesion_id: string
  device_fingerprint: string
  estado_funnel: string
  pregunta_0_id: string
  pregunta_0_texto: string
  pregunta_0_dimension: string
  pregunta_maxima: number
  posicion_rol: string
  arquetipo_calculado: string
  score_personal: number
  score_organizacional: number
  score_comercial: number
  score_empresarial: number
  prioridad_icp: string
  nombre: string
  whatsapp: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  ref_contacto: string
  user_agent: string
  tiempos_json: string
  creado_en: string
  actualizado_en: string
}

export interface SheetPipelineV3 {
  lead_id: string
  sesion_id: string
  etapa_kanban: string
  sla_limite_atencion: string
  prioridad_icp: string
  brief_comercial: string
  notas_seguimiento: string
  motivo_descarte: string
  actualizado_en: string
}

let verifiedTabsForSheetId: string | null = null
let ensurePromise: Promise<void> | null = null

export function hasSheetsConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  )
}

export async function ensureV3Tabs(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
  if (verifiedTabsForSheetId === spreadsheetId) return
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    try {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      })
      const existing = new Set(
        (meta.data.sheets || []).map((s) => s.properties?.title || '').filter(Boolean)
      )

      const needed: { title: string; headers: string[] }[] = []
      if (!existing.has(TAB_SESIONES_V3)) {
        needed.push({ title: TAB_SESIONES_V3, headers: HEADERS_SESIONES_V3 })
      }
      if (!existing.has(TAB_PIPELINE_V3)) {
        needed.push({ title: TAB_PIPELINE_V3, headers: HEADERS_PIPELINE_V3 })
      }
      if (!existing.has(TAB_OUTBOX_V3)) {
        needed.push({ title: TAB_OUTBOX_V3, headers: HEADERS_OUTBOX_V3 })
      }

      if (needed.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: needed.map((n) => ({
              addSheet: { properties: { title: n.title } },
            })),
          },
        })
        await Promise.all(
          needed.map((n) =>
            sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${n.title}!A1`,
              valueInputOption: 'RAW',
              requestBody: { values: [n.headers] },
            })
          )
        )
      }

      verifiedTabsForSheetId = spreadsheetId
    } finally {
      ensurePromise = null
    }
  })()

  return ensurePromise
}

function rowToSesionV3(row: string[]): SheetSesionV3 | null {
  const sesion_id = (row[0] || '').trim()
  if (!sesion_id) return null
  return {
    sesion_id,
    device_fingerprint: row[1] || '',
    estado_funnel: row[2] || 'VISITA_INICIADA',
    pregunta_0_id: row[3] || '',
    pregunta_0_texto: row[4] || '',
    pregunta_0_dimension: row[5] || '',
    pregunta_maxima: Number(row[6] || 0),
    posicion_rol: row[7] || '',
    arquetipo_calculado: row[8] || '',
    score_personal: Number(row[9] || 0),
    score_organizacional: Number(row[10] || 0),
    score_comercial: Number(row[11] || 0),
    score_empresarial: Number(row[12] || 0),
    prioridad_icp: row[13] || '',
    nombre: row[14] || '',
    whatsapp: row[15] || '',
    utm_source: row[16] || '',
    utm_medium: row[17] || '',
    utm_campaign: row[18] || '',
    ref_contacto: row[19] || '',
    user_agent: row[20] || '',
    tiempos_json: row[21] || '',
    creado_en: row[22] || '',
    actualizado_en: row[23] || '',
  }
}

function sesionV3ToRow(s: SheetSesionV3): string[] {
  return [
    s.sesion_id,
    s.device_fingerprint,
    s.estado_funnel,
    s.pregunta_0_id,
    s.pregunta_0_texto,
    s.pregunta_0_dimension,
    String(s.pregunta_maxima || 0),
    s.posicion_rol,
    s.arquetipo_calculado,
    String(s.score_personal || 0),
    String(s.score_organizacional || 0),
    String(s.score_comercial || 0),
    String(s.score_empresarial || 0),
    s.prioridad_icp,
    s.nombre,
    s.whatsapp,
    s.utm_source,
    s.utm_medium,
    s.utm_campaign,
    s.ref_contacto,
    s.user_agent,
    s.tiempos_json,
    s.creado_en,
    s.actualizado_en,
  ]
}

function rowToPipelineV3(row: string[]): SheetPipelineV3 | null {
  const lead_id = (row[0] || '').trim()
  const sesion_id = (row[1] || '').trim()
  if (!lead_id && !sesion_id) return null
  return {
    lead_id: lead_id || `lead_${sesion_id.slice(0, 12)}`,
    sesion_id,
    etapa_kanban: row[2] || 'COMPLETADO_SIN_CONTACTO',
    sla_limite_atencion: row[3] || '',
    prioridad_icp: row[4] || '',
    brief_comercial: row[5] || '',
    notas_seguimiento: row[6] || '',
    motivo_descarte: row[7] || '',
    actualizado_en: row[8] || '',
  }
}

function pipelineV3ToRow(p: SheetPipelineV3): string[] {
  return [
    p.lead_id,
    p.sesion_id,
    p.etapa_kanban,
    p.sla_limite_atencion,
    p.prioridad_icp,
    p.brief_comercial,
    p.notas_seguimiento,
    p.motivo_descarte,
    p.actualizado_en,
  ]
}

export async function sheetsUpsertSesionV3(
  sesionId: string,
  patch: Partial<SheetSesionV3>
): Promise<void> {
  if (!hasSheetsConfig()) return
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_SESIONES_V3}!A2:X`,
  })
  const rows = (res.data.values || []) as string[][]
  let rowIndex = -1
  let existing: SheetSesionV3 | null = null
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][0] || '').trim() === sesionId) {
      rowIndex = i + 2
      existing = rowToSesionV3(rows[i])
      break
    }
  }

  const nowIso = new Date().toISOString()
  const merged: SheetSesionV3 = {
    sesion_id: sesionId,
    device_fingerprint: patch.device_fingerprint ?? existing?.device_fingerprint ?? '',
    estado_funnel: patch.estado_funnel ?? existing?.estado_funnel ?? 'VISITA_INICIADA',
    pregunta_0_id: patch.pregunta_0_id || existing?.pregunta_0_id || '',
    pregunta_0_texto: patch.pregunta_0_texto || existing?.pregunta_0_texto || '',
    pregunta_0_dimension: patch.pregunta_0_dimension || existing?.pregunta_0_dimension || '',
    pregunta_maxima: Math.max(patch.pregunta_maxima ?? 0, existing?.pregunta_maxima ?? 0),
    posicion_rol: patch.posicion_rol || existing?.posicion_rol || '',
    arquetipo_calculado: patch.arquetipo_calculado || existing?.arquetipo_calculado || '',
    score_personal: patch.score_personal ?? existing?.score_personal ?? 0,
    score_organizacional: patch.score_organizacional ?? existing?.score_organizacional ?? 0,
    score_comercial: patch.score_comercial ?? existing?.score_comercial ?? 0,
    score_empresarial: patch.score_empresarial ?? existing?.score_empresarial ?? 0,
    prioridad_icp: patch.prioridad_icp || existing?.prioridad_icp || '',
    nombre: patch.nombre?.trim() ? patch.nombre.trim() : existing?.nombre || '',
    whatsapp: patch.whatsapp?.trim() ? patch.whatsapp.trim() : existing?.whatsapp || '',
    utm_source: patch.utm_source || existing?.utm_source || '',
    utm_medium: patch.utm_medium || existing?.utm_medium || '',
    utm_campaign: patch.utm_campaign || existing?.utm_campaign || '',
    ref_contacto: patch.ref_contacto || existing?.ref_contacto || '',
    user_agent: patch.user_agent || existing?.user_agent || '',
    tiempos_json: patch.tiempos_json || existing?.tiempos_json || '',
    creado_en: existing?.creado_en || patch.creado_en || nowIso,
    actualizado_en: patch.actualizado_en || nowIso,
  }

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB_SESIONES_V3}!A${rowIndex}:X${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [sesionV3ToRow(merged)] },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB_SESIONES_V3}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [sesionV3ToRow(merged)] },
    })
  }
}

export async function sheetsUpsertPipelineV3(
  leadOrSessionId: string,
  patch: Partial<SheetPipelineV3>
): Promise<SheetPipelineV3 | null> {
  if (!hasSheetsConfig()) return null
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_PIPELINE_V3}!A2:I`,
  })
  const rows = (res.data.values || []) as string[][]
  let rowIndex = -1
  let existing: SheetPipelineV3 | null = null
  for (let i = 0; i < rows.length; i++) {
    const parsed = rowToPipelineV3(rows[i])
    if (
      parsed &&
      (parsed.lead_id === leadOrSessionId || parsed.sesion_id === leadOrSessionId)
    ) {
      rowIndex = i + 2
      existing = parsed
      break
    }
  }

  const nowIso = new Date().toISOString()
  const sesionId = patch.sesion_id || existing?.sesion_id || leadOrSessionId
  const leadId =
    existing?.lead_id ||
    patch.lead_id ||
    (leadOrSessionId.startsWith('lead_') ? leadOrSessionId : `lead_${sesionId.slice(0, 12)}`)

  const merged: SheetPipelineV3 = {
    lead_id: leadId,
    sesion_id: sesionId,
    etapa_kanban: patch.etapa_kanban ?? existing?.etapa_kanban ?? 'COMPLETADO_SIN_CONTACTO',
    sla_limite_atencion:
      patch.sla_limite_atencion ??
      existing?.sla_limite_atencion ??
      new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    prioridad_icp: patch.prioridad_icp || existing?.prioridad_icp || 'MEDIA',
    brief_comercial: patch.brief_comercial ?? existing?.brief_comercial ?? '',
    notas_seguimiento:
      patch.notas_seguimiento !== undefined
        ? patch.notas_seguimiento
        : existing?.notas_seguimiento || '',
    motivo_descarte:
      patch.motivo_descarte !== undefined
        ? patch.motivo_descarte
        : existing?.motivo_descarte || '',
    actualizado_en: patch.actualizado_en || nowIso,
  }

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TAB_PIPELINE_V3}!A${rowIndex}:I${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [pipelineV3ToRow(merged)] },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TAB_PIPELINE_V3}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [pipelineV3ToRow(merged)] },
    })
  }

  return merged
}

export async function sheetsRecordOutboxV3(entry: {
  idempotencyKey: string
  sesionId: string
  destino: string
  estado: string
  intentos: number
  ultimoError?: string
}): Promise<void> {
  if (!hasSheetsConfig()) return
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_OUTBOX_V3}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        entry.idempotencyKey,
        entry.sesionId,
        entry.destino,
        entry.estado,
        String(entry.intentos),
        (entry.ultimoError || '').slice(0, 300),
        new Date().toISOString(),
      ]],
    },
  })
}

export async function sheetsFindCompleted72h(
  fingerprint: string
): Promise<SheetSesionV3 | null> {
  if (!hasSheetsConfig()) return null
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_SESIONES_V3}!A2:X`,
  })
  const rows = (res.data.values || []) as string[][]
  const hace72h = Date.now() - 72 * 3600 * 1000

  let match: SheetSesionV3 | null = null
  for (const row of rows) {
    const s = rowToSesionV3(row)
    if (!s) continue
    if (s.device_fingerprint !== fingerprint || s.estado_funnel !== 'COMPLETADO') continue
    const ts = Date.parse(s.creado_en || s.actualizado_en)
    if (!Number.isNaN(ts) && ts >= hace72h) {
      if (!match || ts > Date.parse(match.creado_en || match.actualizado_en)) {
        match = s
      }
    }
  }
  return match
}

export async function sheetsReadV3State(): Promise<{
  sesiones: SheetSesionV3[]
  pipeline: SheetPipelineV3[]
  funnelRows: string[][]
  eventosRows: string[][]
}> {
  if (!hasSheetsConfig()) {
    return { sesiones: [], pipeline: [], funnelRows: [], eventosRows: [] }
  }
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  const [funnelRes, eventosRes, sesV3Res, pipeV3Res] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_FUNNEL}!A2:W` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_EVENTOS}!A2:E` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_SESIONES_V3}!A2:X` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_PIPELINE_V3}!A2:I` }),
  ])

  const sesiones = ((sesV3Res.data.values || []) as string[][])
    .map(rowToSesionV3)
    .filter((x): x is SheetSesionV3 => x !== null)

  const pipeline = ((pipeV3Res.data.values || []) as string[][])
    .map(rowToPipelineV3)
    .filter((x): x is SheetPipelineV3 => x !== null)

  return {
    sesiones,
    pipeline,
    funnelRows: (funnelRes.data.values || []) as string[][],
    eventosRows: (eventosRes.data.values || []) as string[][],
  }
}

const TEST_PREFIXES = [
  'lead_test_',
  'lead_vencido_',
  'lead_urgente_',
  'lead_normal_',
  'lead_reunion_',
  'lead_cerrado_',
  'sess_test_',
  'sess_vencido_',
  'sess_urgente_',
  'sess_normal_',
  'sess_reunion_',
  'sess_cerrado_',
  'sess_live_',
]

export function isTestEntityId(id: string): boolean {
  return TEST_PREFIXES.some((prefix) => id.startsWith(prefix))
}

export async function sheetsClearTestLabData(): Promise<void> {
  if (!hasSheetsConfig()) return
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!
  const sheets = await getSheetsClient()
  await ensureV3Tabs(sheets, spreadsheetId)

  const [sesRes, pipeRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_SESIONES_V3}!A2:A` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${TAB_PIPELINE_V3}!A2:B` }),
  ])

  const ranges: string[] = []
  const sesRows = (sesRes.data.values || []) as string[][]
  sesRows.forEach((row, i) => {
    if (isTestEntityId((row[0] || '').trim())) {
      ranges.push(`${TAB_SESIONES_V3}!A${i + 2}:X${i + 2}`)
    }
  })

  const pipeRows = (pipeRes.data.values || []) as string[][]
  pipeRows.forEach((row, i) => {
    const lid = (row[0] || '').trim()
    const sid = (row[1] || '').trim()
    if (isTestEntityId(lid) || isTestEntityId(sid)) {
      ranges.push(`${TAB_PIPELINE_V3}!A${i + 2}:I${i + 2}`)
    }
  })

  if (ranges.length > 0) {
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId,
      requestBody: { ranges },
    })
  }
}
