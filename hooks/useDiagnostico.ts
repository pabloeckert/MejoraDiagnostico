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

export type DiagnosticoSession = {
  nombre?: string
  respuestas: number[]
  perfil: PerfilKey
  datos: DatosContacto
  scores?: Scores
  posicion?: RespuestaPosicion
}

const KEY = 'mc_diagnostico'
const KEY_LEADS = 'mc_leads'
const KEY_BACKUP = 'mc_diagnostico_backup'
const BACKUP_TTL_MS = 2 * 60 * 60 * 1000 // 2 horas

function persistir(session: Partial<DiagnosticoSession>) {
  const raw = JSON.stringify(session)
  sessionStorage.setItem(KEY, raw)
  try {
    // Fallback: en mobile el OS puede recrear la pestaña (perdiendo sessionStorage)
    // tras una recarga accidental antes de llegar a /datos. localStorage sobrevive eso.
    localStorage.setItem(KEY_BACKUP, JSON.stringify({ ts: Date.now(), session }))
  } catch {
    // storage full — ignorar, no es crítico
  }
}

export function guardarRespuestas(respuestas: number[]) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  persistir({ ...prev, respuestas })
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
  persistir({ ...prev, datos })
}

export function limpiarSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
  try {
    localStorage.removeItem(KEY_BACKUP)
  } catch {
    // ignorar
  }
}

export function cargarSession(): Partial<DiagnosticoSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // sessionStorage corrupto — intentar fallback
  }
  return recuperarBackup()
}

function recuperarBackup(): Partial<DiagnosticoSession> {
  try {
    const raw = localStorage.getItem(KEY_BACKUP)
    if (!raw) return {}
    const { ts, session } = JSON.parse(raw)
    if (typeof ts !== 'number' || Date.now() - ts > BACKUP_TTL_MS) {
      localStorage.removeItem(KEY_BACKUP)
      return {}
    }
    // Restaurar a sessionStorage para que el resto del flujo opere normalmente
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
  } catch {
    // storage full — ignorar
  }
}

export function useDiagnostico() {
  const getSession = useCallback(() => cargarSession(), [])
  return { getSession }
}
