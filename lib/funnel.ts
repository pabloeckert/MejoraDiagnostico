'use client'

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

export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
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
    utm_campaign: params.get('utm_campaign') || '',
    dispositivo: esMobile ? 'Mobile' : 'Desktop',
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
