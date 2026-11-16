import crypto from 'crypto'
import { Resend } from 'resend'
import { PERFILES, type PerfilKey } from '@/lib/perfiles'
import { areasParaMostrar, zonaColor } from '@/lib/areas'
import type { Scores } from '@/lib/scoring'
import { escapeHtml } from '@/lib/sanitize'
import { enviarConReintento } from '@/lib/resend-retry'
import { sendTelegram } from '@/lib/telegram'
import { recordOutboxEntry } from '@/lib/db/repository'

export interface OutboxDispatchInput {
  sessionId: string
  nombre: string
  whatsapp: string
  codPais: string
  perfil: PerfilKey
  scores: Scores
  respuestas: number[]
  pregunta0Texto?: string
  prioridadIcp: string
  briefComercial: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
}

export interface OutboxSummary {
  contactos: string
  nucleo: string
  email: string
  telegram: string
}

function makeKey(sessionId: string, destino: string): string {
  return crypto.createHash('sha256').update(`${sessionId}|${destino}`).digest('hex')
}

/**
 * Despacha integraciones externas exclusivamente del lado del servidor con clave
 * de idempotencia SHA-256 y reporte real (cero falsos positivos ni llamadas desde browser).
 */
export async function dispatchCompletedLead(
  input: OutboxDispatchInput
): Promise<OutboxSummary> {
  const telefonoCompleto = `${input.codPais}${input.whatsapp}`
  const perfilObj = PERFILES[input.perfil]

  const summary: OutboxSummary = {
    contactos: 'OMITIDO_SIN_CREDENCIAL',
    nucleo: 'OMITIDO_SIN_CREDENCIAL',
    email: 'OMITIDO_SIN_CREDENCIAL',
    telegram: 'OMITIDO_SIN_CREDENCIAL',
  }

  // 1. MejoraContactos (Supabase Edge Function, server-side)
  const contactosKey = process.env.CONTACTOS_API_KEY || process.env.NEXT_PUBLIC_CONTACTOS_API_KEY
  const contactosUrl =
    process.env.CONTACTOS_API_URL ||
    process.env.NEXT_PUBLIC_CONTACTOS_API_URL ||
    'https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api'

  if (contactosKey) {
    const payload = {
      source: 'mejora_diagnostico',
      email: '',
      nombre: input.nombre,
      telefono: telefonoCompleto,
      perfil: input.perfil,
      pregunta_0: input.pregunta0Texto || '',
    }
    try {
      const res = await fetch(contactosUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contactosKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      })
      summary.contactos = res.ok ? 'ENVIADO' : 'FALLIDO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'contactos'),
        sesionId: input.sessionId,
        destino: 'contactos',
        payloadJson: JSON.stringify(payload),
        estado: res.ok ? 'ENVIADO' : 'FALLIDO',
        intentos: 1,
        ultimoError: res.ok ? undefined : `HTTP ${res.status}`,
      })
    } catch (e) {
      summary.contactos = 'FALLIDO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'contactos'),
        sesionId: input.sessionId,
        destino: 'contactos',
        payloadJson: JSON.stringify(payload),
        estado: 'FALLIDO',
        intentos: 1,
        ultimoError: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // 2. MejoraNucleo (solo si NUCLEO_API_URL está configurado en el servidor; nunca 127.0.0.1 en browser)
  const nucleoUrl = process.env.NUCLEO_API_URL
  if (nucleoUrl) {
    const cleanPhone = telefonoCompleto.replace(/\D/g, '')
    const payload = {
      nombre: input.nombre.trim(),
      email: `${cleanPhone}@whatsapp.mejoraok.com`,
      telefono: telefonoCompleto,
      canalOrigen: 'diagnostico_4d',
      piezaIdAtribucion: input.utmContent || '',
      utmSource: input.utmSource || 'diagnostico_web',
      utmMedium: input.utmMedium || 'cuestionario_4d',
      utmCampaign: input.utmCampaign || 'diagnostico_continuo',
      utmContent: input.utmContent || '',
      buyerPersonaId: input.perfil,
    }
    try {
      const res = await fetch(nucleoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500),
      })
      summary.nucleo = res.ok ? 'ENVIADO' : 'FALLIDO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'nucleo'),
        sesionId: input.sessionId,
        destino: 'nucleo',
        payloadJson: JSON.stringify(payload),
        estado: res.ok ? 'ENVIADO' : 'FALLIDO',
        intentos: 1,
        ultimoError: res.ok ? undefined : `HTTP ${res.status}`,
      })
    } catch (e) {
      summary.nucleo = 'FALLIDO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'nucleo'),
        sesionId: input.sessionId,
        destino: 'nucleo',
        payloadJson: JSON.stringify(payload),
        estado: 'FALLIDO',
        intentos: 1,
        ultimoError: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // 3. Resend Email
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const areas = areasParaMostrar(input.scores).map((a) => {
      const z = zonaColor(a.porcentaje)
      return `  ${a.nombre}: ${a.porcentaje}% — ${z.zona}`
    })
    const total = input.respuestas.reduce((a, b) => a + b, 0)
    const nombreEsc = escapeHtml(input.nombre)
    const waEsc = escapeHtml(telefonoCompleto)
    const p0Esc = escapeHtml(input.pregunta0Texto || 'No declarada')
    const html = `
      <h2>Nuevo lead [${escapeHtml(input.prioridadIcp)}]: ${nombreEsc} — ${escapeHtml(perfilObj.tag)}</h2>
      <table>
        <tr><td><b>WhatsApp</b></td><td>${waEsc}</td></tr>
        <tr><td><b>Dolor inicial (P0)</b></td><td>${p0Esc}</td></tr>
        <tr><td><b>Perfil</b></td><td>${escapeHtml(perfilObj.tag)}</td></tr>
        <tr><td><b>Puntaje</b></td><td>${total}/32</td></tr>
      </table>
      <h3>Diagnóstico por área</h3>
      <pre>${escapeHtml(areas.join('\n'))}</pre>
      <h3>Brief Comercial</h3>
      <pre>${escapeHtml(input.briefComercial)}</pre>
    `
    try {
      await enviarConReintento(resend, {
        from: 'Mejora Continua <diagnostico@mejoraok.com>',
        to: 'diagnostico@mejoraok.com',
        subject: `[${input.prioridadIcp}] Nuevo lead: ${nombreEsc} — ${perfilObj.tag}`,
        html,
      })
      summary.email = 'ENVIADO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'email'),
        sesionId: input.sessionId,
        destino: 'email',
        payloadJson: JSON.stringify({ nombre: input.nombre, perfil: input.perfil }),
        estado: 'ENVIADO',
        intentos: 1,
      })
    } catch (e) {
      summary.email = 'FALLIDO'
      await recordOutboxEntry({
        idempotencyKey: makeKey(input.sessionId, 'email'),
        sesionId: input.sessionId,
        destino: 'email',
        payloadJson: JSON.stringify({ nombre: input.nombre, perfil: input.perfil }),
        estado: 'FALLIDO',
        intentos: 2,
        ultimoError: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // 4. Telegram Push (si hay credenciales)
  const tgMsg = [
    `🔔 <b>Nuevo diagnóstico [${escapeHtml(input.prioridadIcp)}]</b>`,
    ``,
    `👤 <b>Nombre:</b> ${escapeHtml(input.nombre)}`,
    `📱 <b>WhatsApp:</b> ${escapeHtml(telefonoCompleto)}`,
    `🎯 <b>Perfil:</b> ${escapeHtml(perfilObj.tag)}`,
    input.pregunta0Texto ? `⚡ <b>Freno P0:</b> ${escapeHtml(input.pregunta0Texto)}` : '',
    ``,
    `<pre>${escapeHtml(input.briefComercial)}</pre>`,
  ]
    .filter(Boolean)
    .join('\n')

  const tgRes = await sendTelegram(tgMsg)
  summary.telegram = tgRes.ok
    ? 'ENVIADO'
    : tgRes.reason === 'missing_credentials'
      ? 'OMITIDO_SIN_CREDENCIAL'
      : 'FALLIDO'

  await recordOutboxEntry({
    idempotencyKey: makeKey(input.sessionId, 'telegram'),
    sesionId: input.sessionId,
    destino: 'telegram',
    payloadJson: JSON.stringify({ nombre: input.nombre, perfil: input.perfil }),
    estado:
      summary.telegram === 'ENVIADO'
        ? 'ENVIADO'
        : summary.telegram === 'OMITIDO_SIN_CREDENCIAL'
          ? 'OMITIDO_SIN_CREDENCIAL'
          : 'FALLIDO',
    intentos: 1,
    ultimoError: tgRes.error,
  })

  return summary
}
