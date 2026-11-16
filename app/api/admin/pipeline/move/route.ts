import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sesionValida } from '@/lib/admin-auth'
import { movePipelineLead } from '@/lib/db/repository'
import { ETAPAS_PIPELINE } from '@/lib/pipeline-fsm'

export const runtime = 'nodejs'

const MoveSchema = z.object({
  leadId: z.string().min(1),
  nuevaEtapa: z.enum(ETAPAS_PIPELINE),
  notas: z.string().max(1000).optional(),
  motivoDescarte: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = MoveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'payload_invalido', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const result = await movePipelineLead(parsed.data)
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'db_error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedLead: result.updatedLead,
    })
  } catch (error) {
    console.error('[Pipeline Move] Error inesperado:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
