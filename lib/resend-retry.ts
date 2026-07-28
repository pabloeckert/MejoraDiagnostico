import type { Resend } from 'resend'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// El SDK de Resend no siempre tira excepción ante una falla de la API (auth,
// validación) — devuelve { error } en la respuesta. Sin este chequeo, esas
// fallas quedaban silenciosas y la ruta igual respondía ok:true. Reintenta
// una vez ante fallas transitorias.
export async function enviarConReintento(
  resend: Resend,
  payload: Parameters<Resend['emails']['send']>[0]
) {
  const intentos = 2
  let ultimoError: unknown = null
  for (let intento = 1; intento <= intentos; intento++) {
    const { error } = await resend.emails.send(payload)
    if (!error) return
    ultimoError = error
    console.error(`Resend error (intento ${intento}/${intentos}):`, error)
    if (intento < intentos) await sleep(500)
  }
  throw new Error('Resend: se agotaron los reintentos — ' + JSON.stringify(ultimoError))
}
