import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sesionValida } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/db/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearerValido(req: NextRequest): boolean {
  const tokenEnv = process.env.CRM_API_TOKEN?.trim()
  if (!tokenEnv) return false
  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) return false
  const ha = createHash('sha256').update(match[1].trim()).digest()
  const hb = createHash('sha256').update(tokenEnv).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Endpoint autenticado de consumo para MejoraCRM / MejoraWS.
 * Acepta cookie de sesión /admin o Bearer CRM_API_TOKEN server-side.
 */
export async function GET(req: NextRequest) {
  if (!sesionValida(req) && !bearerValido(req)) {
    return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
  }

  try {
    const { pipeline, liveSessions, storageHealth } = await getAdminDashboardData()
    return NextResponse.json({
      ok: true,
      storageHealth,
      totalPipeline: pipeline.length,
      totalLive: liveSessions.length,
      leads: pipeline,
      liveSessions,
    })
  } catch (e) {
    console.error('[CRM Leads API] Error:', e)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
