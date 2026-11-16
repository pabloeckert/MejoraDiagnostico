import { NextRequest, NextResponse } from 'next/server'
import { sesionValida } from '@/lib/admin-auth'
import { getAdminDashboardData } from '@/lib/db/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    const data = await getAdminDashboardData()
    return NextResponse.json(data)
  } catch (e) {
    console.error('admin/data error:', e)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
