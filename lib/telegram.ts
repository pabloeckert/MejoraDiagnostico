function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export interface TelegramSendResult {
  ok: boolean
  reason?: 'missing_credentials' | 'rate_limited' | 'delivery_failed'
  status?: number
  error?: string
}

let ultimoEnvioMs = 0
const MIN_ESPACIADO_MS = 120

/**
 * Envía un mensaje vía Telegram Bot API y retorna resultado explícito (cero falsos positivos).
 */
export async function sendTelegram(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('Telegram: variables de entorno faltantes (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)')
    return { ok: false, reason: 'missing_credentials', error: 'missing_credentials' }
  }

  const ahora = Date.now()
  const tiempoDesdeUltimo = ahora - ultimoEnvioMs
  if (tiempoDesdeUltimo < MIN_ESPACIADO_MS) {
    await sleep(MIN_ESPACIADO_MS - tiempoDesdeUltimo)
  }
  ultimoEnvioMs = Date.now()

  const intentos = 3
  let lastStatus: number | undefined
  let lastError = 'delivery_failed'

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })

      if (res.ok) {
        return { ok: true, status: res.status }
      }

      lastStatus = res.status
      const errorText = await res.text()
      lastError = errorText.slice(0, 200)

      if (res.status === 429) {
        let waitMs = 2000
        try {
          const json = JSON.parse(errorText) as { parameters?: { retry_after?: number } }
          if (json.parameters?.retry_after) {
            waitMs = json.parameters.retry_after * 1000
          }
        } catch {
          // fallback wait
        }
        await sleep(waitMs)
        continue
      }

      console.error(`Telegram error (intento ${intento}/${intentos}):`, res.status, lastError)
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      console.error(`Telegram fetch error (intento ${intento}/${intentos}):`, lastError)
    }

    if (intento < intentos) await sleep(600 * intento)
  }

  return {
    ok: false,
    reason: lastStatus === 429 ? 'rate_limited' : 'delivery_failed',
    status: lastStatus,
    error: lastError,
  }
}
