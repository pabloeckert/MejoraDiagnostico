function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

let ultimoEnvioMs = 0
const MIN_ESPACIADO_MS = 120 // Espaciado mínimo para no saturar la API de Telegram

export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('Telegram: variables de entorno faltantes (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)')
    return
  }

  // Rate Limiting preventivo en memoria: evitar disparos simultáneos
  const ahora = Date.now()
  const tiempoDesdeUltimo = ahora - ultimoEnvioMs
  if (tiempoDesdeUltimo < MIN_ESPACIADO_MS) {
    await sleep(MIN_ESPACIADO_MS - tiempoDesdeUltimo)
  }
  ultimoEnvioMs = Date.now()

  const intentos = 3
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })

      if (res.ok) return

      const status = res.status
      const errorText = await res.text()

      // Si Telegram responde 429 Too Many Requests, respetar backoff
      if (status === 429) {
        let waitMs = 2000
        try {
          const json = JSON.parse(errorText)
          if (json.parameters?.retry_after) {
            waitMs = json.parameters.retry_after * 1000
          }
        } catch {}
        console.warn(`[Telegram Bot] 429 Rate limit excedido. Esperando ${waitMs}ms...`)
        await sleep(waitMs)
        continue
      }

      console.error(`Telegram error (intento ${intento}/${intentos}):`, status, errorText)
    } catch (e) {
      console.error(`Telegram fetch error (intento ${intento}/${intentos}):`, e)
    }

    if (intento < intentos) await sleep(600 * intento)
  }
  console.error('Telegram: se agotaron los reintentos, mensaje no enviado')
}
