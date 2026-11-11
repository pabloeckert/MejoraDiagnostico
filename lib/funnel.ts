'use client'

import { getDeviceFingerprint } from './fingerprint'

const SESSION_KEY = 'mc_session_id'
const VISITOR_KEY = 'mc_visitor_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export function setSessionId(id: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEY, id)
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  // Si ya tenemos el fingerprint en memoria/almacenamiento, usarlo como visitor_id soberano
  const fp = sessionStorage.getItem('mc_device_fingerprint') || localStorage.getItem('mc_device_fingerprint')
  if (fp) return fp

  let vid = localStorage.getItem(VISITOR_KEY)
  if (!vid) {
    vid = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, vid)
  }
  return vid
}

export function getContextoLanding() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const esMobile = /Mobi|Android/i.test(navigator.userAgent)
  return {
    referrer: document.referrer || 'directo',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    ref_contacto: params.get('ref_wa') || params.get('ref') || '',
    dispositivo: esMobile ? 'Mobile' : 'Desktop',
  }
}

export interface TelemetryVisitResult {
  sesionId?: string
  blocked: boolean
  message?: string
  previousResult?: {
    arquetipo?: string
    nombre?: string
    whatsapp?: string
    scores?: {
      personal?: number
      organizacional?: number
      comercial?: number
      empresarial?: number
    }
  }
}

export async function registrarVisitaTemprana(): Promise<TelemetryVisitResult> {
  if (typeof window === 'undefined') return { blocked: false }

  try {
    const fingerprint = await getDeviceFingerprint()
    const params = new URLSearchParams(window.location.search)
    const force = params.get('force') === '1'

    const payload = {
      fingerprint,
      utms: {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        ref_contacto: params.get('ref_wa') || params.get('ref') || '',
      },
      referrer: document.referrer || '',
      force,
    }

    const res = await fetch('/api/telemetry/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return { blocked: false, sesionId: getSessionId() }
    }

    const data: TelemetryVisitResult = await res.json()
    if (data.sesionId) {
      setSessionId(data.sesionId)
    }

    if (data.blocked && data.previousResult) {
      sessionStorage.setItem('mc_bloqueado_72h', '1')
      sessionStorage.setItem('mc_resultado_previo', JSON.stringify(data.previousResult))
    }

    return data
  } catch (err) {
    console.warn('[Telemetry] Error en registro temprano:', err)
    return { blocked: false, sesionId: getSessionId() }
  }
}

export function trackFunnel(
  evento: string,
  datos?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  fetch('/api/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      evento,
      timestamp: new Date().toISOString(),
      ...datos,
    }),
    keepalive: true,
  }).catch(() => {})
}
