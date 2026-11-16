import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'

const req = typeof require !== 'undefined' ? require : createRequire(import.meta.url)

export interface SqliteStatement {
  run: (...params: unknown[]) => { changes?: number | bigint; lastInsertRowid?: number | bigint }
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  all: (...params: unknown[]) => Record<string, unknown>[]
}

export interface SqliteDatabase {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
}

let dbInstance: SqliteDatabase | null = null
let sqliteInitError: string | null = null

export function isServerlessEphemeral(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

function getLocalDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH
  }
  const smPath = path.resolve('..', 'MejoraSM', 'data', 'mejora_sm.db')
  if (fs.existsSync(path.dirname(smPath)) && fs.existsSync(smPath)) {
    return smPath
  }
  const localDir = path.resolve(process.cwd(), 'data')
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true })
  }
  return path.resolve(localDir, 'mejora_sm.db')
}

function ensureColumn(db: SqliteDatabase, table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  const exists = cols.some((c) => c.name === column)
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`)
  }
}

function initSchema(db: SqliteDatabase) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS diagnostico_sesiones (
      sesion_id TEXT PRIMARY KEY,
      device_fingerprint TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      ref_contacto TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      estado_funnel TEXT CHECK(estado_funnel IN (
        'VISITA_INICIADA', 'EN_CUESTIONARIO', 'FORMULARIO_DATOS',
        'COMPLETADO', 'ABANDONADO', 'BLOQUEADO_REINTENTO', 'INTENTO_SECUNDARIO_MUTADO'
      )) NOT NULL DEFAULT 'VISITA_INICIADA',
      pregunta_maxima INTEGER DEFAULT 0,
      arquetipo_calculado TEXT,
      score_personal REAL DEFAULT 0,
      score_organizacional REAL DEFAULT 0,
      score_comercial REAL DEFAULT 0,
      score_empresarial REAL DEFAULT 0,
      nombre TEXT,
      whatsapp TEXT,
      whatsapp_normalizado TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS diagnostico_respuestas (
      respuesta_id TEXT PRIMARY KEY,
      sesion_id TEXT NOT NULL,
      pregunta_id INTEGER NOT NULL,
      opcion_seleccionada TEXT NOT NULL,
      tiempo_segundos REAL NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sesion_id) REFERENCES diagnostico_sesiones(sesion_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diagnostico_pipeline_comercial (
      lead_id TEXT PRIMARY KEY,
      sesion_id TEXT UNIQUE NOT NULL,
      etapa_kanban TEXT CHECK(etapa_kanban IN (
        'COMPLETADO_SIN_CONTACTO', 'EN_CONTACTO_WHATSAPP',
        'REUNION_AGENDADA', 'PROPUESTA_ENVIADA',
        'CERRADO_GANADO', 'DESCARTADO'
      )) NOT NULL DEFAULT 'COMPLETADO_SIN_CONTACTO',
      sla_limite_atencion TEXT NOT NULL,
      motivo_descarte TEXT,
      notas_seguimiento TEXT,
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sesion_id) REFERENCES diagnostico_sesiones(sesion_id)
    );

    CREATE TABLE IF NOT EXISTS diagnostico_outbox (
      idempotency_key TEXT PRIMARY KEY,
      sesion_id TEXT NOT NULL,
      destino TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      estado TEXT CHECK(estado IN ('PENDIENTE', 'ENVIADO', 'OMITIDO_SIN_CREDENCIAL', 'FALLIDO')) NOT NULL DEFAULT 'PENDIENTE',
      intentos INTEGER NOT NULL DEFAULT 0,
      ultimo_error TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_diag_fingerprint ON diagnostico_sesiones(device_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_diag_sla ON diagnostico_pipeline_comercial(sla_limite_atencion, etapa_kanban);
    CREATE INDEX IF NOT EXISTS idx_diag_outbox_estado ON diagnostico_outbox(estado, actualizado_en);
  `)

  // Migraciones aditivas V3 idempotentes
  ensureColumn(db, 'diagnostico_sesiones', 'pregunta_0_id', 'TEXT')
  ensureColumn(db, 'diagnostico_sesiones', 'pregunta_0_texto', 'TEXT')
  ensureColumn(db, 'diagnostico_sesiones', 'pregunta_0_dimension', 'TEXT')
  ensureColumn(db, 'diagnostico_sesiones', 'posicion_rol', 'TEXT')
  ensureColumn(db, 'diagnostico_sesiones', 'prioridad_icp', 'TEXT')
  ensureColumn(db, 'diagnostico_sesiones', 'tiempos_json', 'TEXT')
  ensureColumn(db, 'diagnostico_pipeline_comercial', 'prioridad_icp', 'TEXT')
  ensureColumn(db, 'diagnostico_pipeline_comercial', 'brief_comercial', 'TEXT')
}

/**
 * Retorna la base SQLite WAL local cuando no corre en serverless efímero.
 * En Vercel (/tmp no compartido), retorna null explícitamente para evitar falsos positivos.
 */
export function getLocalDatabase(): SqliteDatabase | null {
  if (isServerlessEphemeral()) {
    return null
  }
  if (dbInstance) return dbInstance

  try {
    const mod = req('node:sqlite') as { DatabaseSync: new (p: string) => SqliteDatabase }
    const dbPath = getLocalDbPath()
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const db = new mod.DatabaseSync(dbPath)
    initSchema(db)
    dbInstance = db
    sqliteInitError = null
    return dbInstance
  } catch (error) {
    sqliteInitError = error instanceof Error ? error.message : String(error)
    console.warn('[SQLite Local] Motor no disponible:', sqliteInitError)
    return null
  }
}

export function getSqliteInitError(): string | null {
  return sqliteInitError
}

/**
 * Alias de compatibilidad para scripts CLI locales (node scripts/*.mjs).
 */
export function getDatabase(): SqliteDatabase {
  const db = getLocalDatabase()
  if (!db) {
    throw new Error(
      sqliteInitError || 'SQLite local deshabilitado en entorno serverless efímero.'
    )
  }
  return db
}
