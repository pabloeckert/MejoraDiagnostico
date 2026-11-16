import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { checkBreaker72h, recordVisit } from '@/lib/db/repository'
import { hasSheetsConfig } from '@/lib/db/sheets-store'
import { getSheetsClient } from '@/lib/sheets'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const VisitSchema = z.object({
  fingerprint: z.string().min(1).max(200),
  utms: z
    .object({
      utm_source: z.string().max(200).optional(),
      utm_medium: z.string().max(200).optional(),
      utm_campaign: z.string().max(200).optional(),
      utm_content: z.string().max(200).optional(),
      ref_contacto: z.string().max(200).optional(),
    })
    .optional(),
  referrer: z.string().max(500).optional(),
  force: z.boolean().optional(),
})

function hashIp(ip: string): string {
  if (!ip) return 'unknown_ip'
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(req, 'telemetry_visit', 100)) {
      return NextResponse.json({ ok: false, error: 'rate_limit' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = VisitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
    }

    const { fingerprint, utms = {}, referrer = '', force = false } = parsed.data
    const userAgent = req.headers.get('user-agent') || ''
    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      ''
    const ipHash = hashIp(rawIp)

    // 1. Breaker Anti-Picardía (consulta SQLite local y Google Sheets V3 en Vercel)
    const completadoPrevio = await checkBreaker72h(fingerprint)

    if (completadoPrevio && !force) {
      return NextResponse.json(
        {
          sesionId: completadoPrevio.sesionId,
          blocked: true,
          message: 'Ya calculamos tu diagnóstico estratégico en las últimas 72 horas.',
          previousResult: {
            arquetipo: completadoPrevio.arquetipo,
            nombre: completadoPrevio.nombre,
            whatsapp: completadoPrevio.whatsapp,
            scores: completadoPrevio.scores,
          },
        },
        { status: 200 }
      )
    }

    // 2. Nueva sesión o reintento forzado (?force=1)
    const newSessionId = crypto.randomUUID()
    const estadoInicial: 'VISITA_INICIADA' | 'INTENTO_SECUNDARIO_MUTADO' =
      completadoPrevio && force ? 'INTENTO_SECUNDARIO_MUTADO' : 'VISITA_INICIADA'

    await recordVisit({
      sesionId: newSessionId,
      fingerprint,
      estado: estadoInicial,
      utmSource: utms.utm_source || '',
      utmMedium: utms.utm_medium || '',
      utmCampaign: utms.utm_campaign || '',
      refContacto: utms.ref_contacto || referrer,
      ipHash,
      userAgent,
    })

    // Registro inmutable en hoja Eventos (no bloqueante)
    if (hasSheetsConfig()) {
      const timestampIso = new Date().toISOString()
      getSheetsClient()
        .then((sheets) =>
          sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'Eventos!A1',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [
                [
                  timestampIso,
                  fingerprint,
                  newSessionId,
                  estadoInicial,
                  `utm:${utms.utm_source || 'directo'} · ref:${referrer.slice(0, 100)} · ip:${ipHash}`,
                ],
              ],
            },
          })
        )
        .catch((err) => console.warn('[Telemetry] Error append Eventos:', err))
    }

    return NextResponse.json(
      {
        sesionId: newSessionId,
        blocked: false,
        estado: estadoInicial,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Telemetry Visit] Error no controlado:', error)
    return NextResponse.json(
      {
        sesionId: crypto.randomUUID(),
        blocked: false,
        error: 'internal_fallback',
      },
      { status: 200 }
    )
  }
}
