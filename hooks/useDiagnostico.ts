'use client'
import { useCallback } from 'react'
import type { PerfilKey } from '@/lib/perfiles'

export type DatosContacto = {
  nombre: string
  apellido?: string
  empresa?: string
  codPais: string
  whatsapp: string
  email: string
}

export type DiagnosticoSession = {
  respuestas: number[]
  perfil: PerfilKey
  datos: DatosContacto
}

const KEY = 'mc_diagnostico'
const KEY_LEADS = 'mc_leads'

export function guardarRespuestas(respuestas: number[]) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  sessionStorage.setItem(KEY, JSON.stringify({ ...prev, respuestas }))
}

export function guardarPerfil(perfil: PerfilKey) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  sessionStorage.setItem(KEY, JSON.stringify({ ...prev, perfil }))
}

export function guardarDatos(datos: DatosContacto) {
  if (typeof window === 'undefined') return
  const prev = cargarSession()
  sessionStorage.setItem(KEY, JSON.stringify({ ...prev, datos }))
}

export function cargarSession(): Partial<DiagnosticoSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function guardarLead(lead: {
  nombre: string; apellido?: string; empresa?: string
  whatsapp: string; email: string; perfil: string
  total: number; respuestas: number[]
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
