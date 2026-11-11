/**
 * Generador de Huella Digital de Dispositivo (Hardware Fingerprint)
 * Ultraliviano (< 4 KB), determinístico, sin dependencias externas npm.
 *
 * Combina Canvas 2D, WebGL, geometría de pantalla y parámetros de hardware
 * para generar un identificador único y persistente, incluso en modo incógnito.
 */

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'canvas_unsupported'

    // Fondo y formas geométricas
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial', 'Helvetica', sans-serif"
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)

    // Texto superpuesto con sombreado y gradiente
    ctx.fillStyle = '#069'
    ctx.fillText('MejoraDiagnostico 4D \ud83d\ude80', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('MejoraDiagnostico 4D \ud83d\ude80', 4, 17)

    // Arcos y composición
    ctx.beginPath()
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()

    return canvas.toDataURL()
  } catch {
    return 'canvas_error'
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'webgl_unsupported'

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'no_vendor'
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'no_renderer'

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)

    return `${vendor}~${renderer}~${maxTextureSize}~${maxRenderBufferSize}`
  } catch {
    return 'webgl_error'
  }
}

function getHardwareParams(): string {
  if (typeof window === 'undefined') return ''
  const scr = window.screen
  const nav = window.navigator as any

  const screenData = [
    scr.width,
    scr.height,
    scr.availWidth,
    scr.availHeight,
    scr.colorDepth,
    scr.pixelDepth,
    window.devicePixelRatio || 1,
  ].join('x')

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown_tz'
  const cores = nav.hardwareConcurrency || 2
  const languages = Array.isArray(nav.languages) ? nav.languages.join(',') : nav.language || ''
  const platform = nav.platform || ''

  return [screenData, timeZone, cores, languages, platform].join(';')
}

async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback simple por si SubtleCrypto no estuviera en contexto no-seguro
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return 'fp_' + Math.abs(hash).toString(16).padStart(16, '0')
}

let cachedFingerprint: string | null = null

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server_side'
  if (cachedFingerprint) return cachedFingerprint

  // Intentar leer de sessionStorage primero para ultra-velocidad (<1 ms)
  const stored = sessionStorage.getItem('mc_device_fingerprint')
  if (stored) {
    cachedFingerprint = stored
    return stored
  }

  const canvasRaw = getCanvasFingerprint()
  const webglRaw = getWebGLFingerprint()
  const hardwareRaw = getHardwareParams()

  const combined = `canvas:${canvasRaw}|webgl:${webglRaw}|hw:${hardwareRaw}`
  const hash = await sha256Hex(combined)

  cachedFingerprint = hash
  try {
    sessionStorage.setItem('mc_device_fingerprint', hash)
    // También guardamos en localStorage para persistencia cruzada
    localStorage.setItem('mc_device_fingerprint', hash)
  } catch {}

  return hash
}
