import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { getDatabase } from '@/lib/db/sqlite'
import { getSheetsClient } from '@/lib/sheets'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const VisitSchema = z.object({
  fingerprint: z.string().min(1).max(200),
  utms: z.object({
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    ref_contacto: z.string().max(200).optional(),
  }).optional(),
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
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || ''
    const ipHash = hashIp(rawIp)

    const db = getDatabase()

    // 1. Breaker Anti-Picardía: Verificar si este dispositivo completó en las últimas 72 horas
    let completadoPrevio: any = null
    try {
      const stmt = db.prepare(`
        SELECT sesion_id, arquetipo_calculado, score_personal, score_organizacional, 
               score_comercial, score_empresarial, nombre, whatsapp, creado_en
        FROM diagnostico_sesiones
        WHERE device_fingerprint = ? AND estado_funnel = 'COMPLETADO' 
          AND creado_en >= datetime('now', '-72 hours')
        ORDER BY creado_en DESC LIMIT 1
      `)
      completadoPrevio = stmt.get(fingerprint)
    } catch (e) {
      console.warn('[Telemetry] Error consultando completado previo en SQLite:', e)
    }

    // Ruta de Bloqueo Elegante (Default):
    if (completadoPrevio && !force) {
      return NextResponse.json(
        {
          sesionId: completadoPrevio.sesion_id,
          blocked: true,
          message: 'Ya calculamos tu diagnóstico estratégico en las últimas 72 horas.',
          previousResult: {
            arquetipo: completadoPrevio.arquetipo_calculado,
            nombre: completadoPrevio.nombre,
            whatsapp: completadoPrevio.whatsapp,
            scores: {
              personal: completadoPrevio.score_personal,
              organizacional: completadoPrevio.score_organizacional,
              comercial: completadoPrevio.score_comercial,
              empresarial: completadoPrevio.score_empresarial,
            },
          },
        },
        { status: 200 }
      )
    }

    // 2. Nueva Sesión (o Reintento Forzado con ?force=1)
    const newSessionId = crypto.randomUUID()
    const estadoInicial = (completadoPrevio && force) ? 'INTENTO_SECUNDARIO_MUTADO' : 'VISITA_INICIADA'

    // Persistir en SQLite Soberano
    try {
      const insertStmt = db.prepare(`
        INSERT INTO diagnostico_sesiones (
          sesion_id, device_fingerprint, utm_source, utm_medium, utm_campaign,
          ref_contacto, ip_hash, user_agent, estado_funnel, creado_en, actualizado_en
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, datetime('now'), datetime('now')
        )
      `)
      insertStmt.run(
        newSessionId,
        fingerprint,
        utms.utm_source || '',
        utms.utm_medium || '',
        utms.utm_campaign || '',
        utms.ref_contacto || referrer,
        ipHash,
        userAgent.slice(0, 255),
        estadoInicial
      )
    } catch (e) {
      console.error('[Telemetry] Error insertando sesión en SQLite:', e)
    }

    // Persistencia asíncrona en Google Sheets (Hoja Eventos) para auditoría inmutable
    const timestampIso = new Date().toISOString()
    const sheetsPromise = (async () => {
      try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEETS_ID) {
          const sheets = await getSheetsClient()
          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            range: 'Eventos!A1',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [[
                timestampIso,
                fingerprint,
                newSessionId,
                estadoInicial,
                `utm:${utms.utm_source || 'directo'} · ref:${referrer.slice(0, 100)} · ip:${ipHash}`
              ]]
            }
          })
        }
      } catch (sheetsErr) {
        console.warn('[Telemetry] Error append en Google Sheets Eventos:', sheetsErr)
      }
    })()

    // No bloqueamos la respuesta HTTP por Google Sheets
    sheetsPromise.catch(() => {})

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
        error: 'internal_fallback'
      },
      { status: 200 }
    )
  }
}
