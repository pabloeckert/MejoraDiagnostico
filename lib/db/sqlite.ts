/* eslint-disable */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'

const req = typeof require !== 'undefined' ? require : createRequire(import.meta.url)

// Interfaz para la base de datos SQLite
let dbInstance: any = null

function getDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH
  }
  // En Vercel / Serverless el filesystem raíz es de solo lectura, usamos /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.resolve('/tmp', 'mejora_data')
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true })
      } catch {}
    }
    return path.resolve(tmpDir, 'mejora_sm.db')
  }
  // 1. Si existe en el repositorio hermano MejoraSM, conectar a la base soberana compartida
  const smPath = path.resolve('..', 'MejoraSM', 'data', 'mejora_sm.db')
  if (fs.existsSync(path.dirname(smPath)) && fs.existsSync(smPath)) {
    return smPath
  }
  // 2. Si no, en data/ dentro de este repo
  const localDir = path.resolve(process.cwd(), 'data')
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true })
    } catch {
      // Entorno read-only -> fallback a /tmp
      const tmpDir = path.resolve('/tmp', 'mejora_data')
      if (!fs.existsSync(tmpDir)) {
        try {
          fs.mkdirSync(tmpDir, { recursive: true })
        } catch {}
      }
      return path.resolve(tmpDir, 'mejora_sm.db')
    }
  }
  return path.resolve(localDir, 'mejora_sm.db')
}

export function getDatabase(): any {
  if (dbInstance) return dbInstance

  try {
    // Usamos el módulo nativo node:sqlite de Node.js >= 22
    const { DatabaseSync } = req('node:sqlite')
    const dbPath = getDbPath()
    
    // Asegurar directorio padre
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const db = new DatabaseSync(dbPath)

    // Configuración WAL para concurrencia y tolerancia a picos
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;
    `)

    // Crear tablas según especificación del Manifiesto V2
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

      CREATE INDEX IF NOT EXISTS idx_diag_fingerprint ON diagnostico_sesiones(device_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_diag_sla ON diagnostico_pipeline_comercial(sla_limite_atencion, etapa_kanban);
    `)

    dbInstance = db
    return dbInstance
  } catch (error) {
    console.error('[SQLite Soberano] Error inicializando base de datos:', error)
    // Retornamos un mock seguro para que los endpoints no exploten si el motor no está disponible
    return {
      prepare: () => ({
        run: () => ({}),
        get: () => null,
        all: () => [],
      }),
      exec: () => {},
    }
  }
}
