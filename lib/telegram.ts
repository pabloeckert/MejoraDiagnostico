function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Reintenta una vez ante fallas transitorias (timeout, 5xx) antes de darse
// por vencido — Resend/Telegram tienen caídas breves que antes perdían el
// lead en silencio en el primer intento.
export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('Telegram: variables de entorno faltantes')
    return
  }

  const intentos = 2
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })
      if (res.ok) return
      console.error(`Telegram error (intento ${intento}/${intentos}):`, await res.text())
    } catch (e) {
      console.error(`Telegram fetch error (intento ${intento}/${intentos}):`, e)
    }
    if (intento < intentos) await sleep(500)
  }
  console.error('Telegram: se agotaron los reintentos, mensaje no enviado')
}
