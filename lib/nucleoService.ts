/**
 * Servicio de Enchufe Universal hacia MejoraNucleo REST API (Puerto 4002 / 3000)
 * Permite a MejoraDiagnostico enviar leads completados con puntuación 4D y Buyer Persona.
 */

export interface DiagnosticoNucleoPayload {
  nombre: string
  email: string
  telefono: string
  perfilKey: string
  perfilNombre?: string
  totalPuntos?: number
  scores?: Record<string, number>
  piezaIdAtribucion?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
}

export interface EnviarDiagnosticoResult {
  ok: boolean
  prospectoId?: string
  error?: string
}

const LOCAL_STORAGE_PENDING_KEY = 'mc_diagnosticos_nucleo_pendientes'

function getApiUrl(): string {
  if (typeof window !== 'undefined' && (window as any).MEJORA_NUCLEO_URL) {
    return (window as any).MEJORA_NUCLEO_URL
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NUCLEO_API_URL) {
    return process.env.NEXT_PUBLIC_NUCLEO_API_URL
  }
  // En desarrollo o despliegue local se conecta al puerto 4002 de MejoraNucleo
  return 'http://127.0.0.1:4002/api/prospectos'
}

export async function enviarDiagnosticoANucleo(
  payload: DiagnosticoNucleoPayload
): Promise<EnviarDiagnosticoResult> {
  const apiUrl = getApiUrl()

  // Extraer parámetros UTM o pieza de atribución si están presentes en la URL
  let utmSource = payload.utmSource || ''
  let utmMedium = payload.utmMedium || ''
  let utmCampaign = payload.utmCampaign || ''
  let utmContent = payload.utmContent || ''
  let piezaId = payload.piezaIdAtribucion || ''

  if (typeof window !== 'undefined' && window.location && window.location.search) {
    const params = new URLSearchParams(window.location.search)
    utmSource = utmSource || params.get('utm_source') || ''
    utmMedium = utmMedium || params.get('utm_medium') || ''
    utmCampaign = utmCampaign || params.get('utm_campaign') || ''
    utmContent = utmContent || params.get('utm_content') || ''
    piezaId = piezaId || params.get('pieza_id_atribucion') || params.get('pieza_id') || utmContent || ''
  }

  const bodyData = {
    nombre: payload.nombre.trim(),
    email: payload.email.trim().toLowerCase() || `${payload.telefono.replace(/\D/g, '')}@whatsapp.mejoraok.com`,
    telefono: payload.telefono.trim(),
    canalOrigen: 'diagnostico_4d',
    piezaIdAtribucion: piezaId,
    utmSource: utmSource || 'diagnostico_web',
    utmMedium: utmMedium || 'cuestionario_4d',
    utmCampaign: utmCampaign || 'diagnostico_continuo',
    utmContent: utmContent,
    buyerPersonaId: payload.perfilKey
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(bodyData),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok || res.status === 201) {
      const data = await res.json().catch(() => ({}))
      console.info('[MejoraDiagnostico -> Núcleo] Prospecto 4D registrado con SLA 48h:', data)
      return { ok: true, prospectoId: data.id }
    }

    const errData = await res.json().catch(() => ({}))
    console.warn('[MejoraDiagnostico -> Núcleo] Servidor respondió con error:', errData)
    guardarEnColaOffline(bodyData)
    return { ok: false, error: errData.error || `HTTP ${res.status}` }
  } catch (err: unknown) {
    console.warn('[MejoraDiagnostico -> Núcleo] No se pudo conectar a la API. Guardando en cola local offline:', err)
    guardarEnColaOffline(bodyData)
    return { ok: false, error: 'Offline / Servidor inalcanzable' }
  }
}

function guardarEnColaOffline(bodyData: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push({ ...bodyData, timestamp: new Date().toISOString() })
    localStorage.setItem(LOCAL_STORAGE_PENDING_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('[MejoraDiagnostico] Error al escribir en localStorage:', e)
  }
}
