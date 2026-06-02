'use client'

const SESSION_KEY = 'mc_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
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
      evento,
      timestamp: new Date().toISOString(),
      ...datos,
    }),
    keepalive: true,
  }).catch(() => {})
}
