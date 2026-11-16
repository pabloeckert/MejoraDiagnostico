'use client'
import { useCallback } from 'react'
import type { PerfilKey } from '@/lib/perfiles'
import type { Scores } from '@/lib/scoring'
import type { RespuestaPosicion } from '@/lib/preguntas'

export type DatosContacto = {
  nombre: string
  codPais: string
  whatsapp: string
}

export type Pregunta0Data = {
  id: string
  texto: string
  dimension: 'personal' | 'organizacional' | 'comercial' | 'empresarial'
}

export type DiagnosticoSession = {
  nombre?: string
  respuestas: number[]
  tiempos?: number[]
  perfil: PerfilKey
  datos: DatosContacto
  scores?: Scores
  posicion?: RespuestaPosicion
  pregunta0?: Pregunta0Data
}

const KEY = 'mc_diagnostico'
const KEY_LEADS = 'mc_leads'
const KEY_BACKUP = 'mc_diagnostico_backup'
const KEY_P0 = 'mc_pregunta_0'
const BACKUP_TTL_MS = 2 * 60 * 60 * 1000

function persistir(session: Partial<DiagnosticoSession>) {
  const raw = JSON.stringify(session)
  sessionStorage.setItem(KEY, raw)
  try {
    localStorage.setItem(KEY_BACKUP, JSON.stringify({ ts: Date.now(), session }))
  } catch {
    // storage lleno — ignorar
  }
}

export function guardarPregunta0(pregunta0: Pregunta0Data) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KEY_P0, JSON.stringify(pregunta0))
  } catch {}
  const prev = cargarSession()
  persistir({ ...prev, pregunta0 })
}

export function cargarPregunta0(): Pregunta0Data | undefined {
  if (typeof window === 'undefined') return undefined
  const s = cargarSession()
  if (s.pregunta0) return s.pregunta0
  try {
    const raw = sessionStorage.getItem(KEY_P0)
    if (raw) return JSON.parse(raw) as Pregunta0Data
  } catch {}
  return undefined
}

export function guardarRespuestas(respuestas: number[]) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, respuestas })
}

export function guardarTiempos(tiempos: number[]) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, tiempos })
}

export function guardarPerfil(perfil: PerfilKey) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, perfil })
}

export function guardarScores(scores: Scores) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, scores })
}

export function guardarPosicion(posicion: RespuestaPosicion) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, posicion })
}

export function guardarDatos(datos: DatosContacto) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, nombre: datos.nombre, datos })
}

export function limpiarSession(preservarPregunta0 = false) {
  if (typeof window === 'undefined') return
  const p0 = preservarPregunta0 ? cargarPregunta0() : undefined
  sessionStorage.removeItem(KEY)
  try {
    localStorage.removeItem(KEY_BACKUP)
  } catch {}
  if (p0) {
    guardarPregunta0(p0)
  } else {
    sessionStorage.removeItem(KEY_P0)
  }
}

export function cargarSession(): Partial<DiagnosticoSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Partial<DiagnosticoSession>
  } catch {
    // sessionStorage corrupto — intentar backup
  }
  return recuperarBackup()
}

function recuperarBackup(): Partial<DiagnosticoSession> {
  try {
    const raw = localStorage.getItem(KEY_BACKUP)
    if (!raw) return {}
    const { ts, session } = JSON.parse(raw) as {
      ts: number
      session: Partial<DiagnosticoSession>
    }
    if (typeof ts !== 'number' || Date.now() - ts > BACKUP_TTL_MS) {
      localStorage.removeItem(KEY_BACKUP)
      return {}
    }
    sessionStorage.setItem(KEY, JSON.stringify(session))
    return session
  } catch {
    return {}
  }
}

export function guardarLead(lead: {
  nombre: string
  whatsapp: string
  perfil: string
  total: number
  respuestas: number[]
}) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(KEY_LEADS)
    const leads = raw ? JSON.parse(raw) : []
    leads.push({ ts: new Date().toISOString(), ...lead })
    localStorage.setItem(KEY_LEADS, JSON.stringify(leads))
  } catch {}
}

export function useDiagnostico() {
  const getSession = useCallback(() => cargarSession(), [])
  return { getSession }
}
