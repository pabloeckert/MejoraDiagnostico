// Tipos y utilidades del dashboard interno de monitoreo (/admin).
// Espejan el orden de columnas de las hojas Funnel (A-W) y Eventos (A-E)
// definido en app/api/funnel/route.ts y scripts/fix-headers.ts.

export interface SessionRow {
  session_id: string
  fecha_inicio: string
  nombre: string
  whatsapp: string
  perfil: string
  paso: string
  p1: string
  p2: string
  p3: string
  p4: string
  p5: string
  p6: string
  p7: string
  p8: string
  resultado_visto: string
  abandono_en: string
  ultimo_update: string
  cta_click: string
  visitor_id: string
  origen: string
  dispositivo: string
  tiempos_preguntas: string
  retomado: string
}

export interface EventoRow {
  timestamp: string
  visitor_id: string
  session_id: string
  evento: string
  detalle: string
}

export type EstadoSesion = 'completado' | 'en_curso' | 'retomado' | 'abandonado'
export type RangoFecha = 'hoy' | '7dias' | 'todo'

const VEINTE_MIN_MS = 20 * 60 * 1000

export function esCompletada(s: SessionRow): boolean {
  return s.cta_click === 'SÍ' || s.paso === 'whatsapp_contactado'
}

export function calcularEstado(s: SessionRow, ahora: number = Date.now()): EstadoSesion {
  if (esCompletada(s)) return 'completado'
  if (s.retomado === 'SÍ') return 'retomado'
  const ultimo = Date.parse(s.ultimo_update || s.fecha_inicio)
  if (!isNaN(ultimo) && ahora - ultimo > VEINTE_MIN_MS) return 'abandonado'
  return 'en_curso'
}

export function tiempoTranscurrido(fechaInicio: string, ahora: number = Date.now()): string {
  const inicio = Date.parse(fechaInicio)
  if (isNaN(inicio)) return '—'
  const mins = Math.max(0, Math.floor((ahora - inicio) / 60000))
  return `${mins}m`
}

export function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function sumarTiempos(tiemposStr: string): number {
  return tiemposStr
    .split(',')
    .map(Number)
    .filter((n) => !isNaN(n))
    .reduce((a, b) => a + b, 0)
}

function formatMinSeg(totalSegundos: number): string {
  const m = Math.floor(totalSegundos / 60)
  const s = Math.round(totalSegundos % 60)
  return `${m}m ${s}s`
}

export function tiempoPromedioSesion(sessions: SessionRow[]): string {
  const totales = sessions
    .filter(esCompletada)
    .map((s) => s.tiempos_preguntas)
    .filter(Boolean)
    .map(sumarTiempos)
    .filter((t) => t > 0)
  if (!totales.length) return '—'
  const promedio = totales.reduce((a, b) => a + b, 0) / totales.length
  return formatMinSeg(promedio)
}

export function inicioRango(rango: RangoFecha): number {
  if (rango === 'todo') return -Infinity
  if (rango === 'hoy') return new Date().setHours(0, 0, 0, 0)
  return Date.now() - 7 * 24 * 60 * 60 * 1000
}

export function filtrarSesionesPorRango(sessions: SessionRow[], rango: RangoFecha): SessionRow[] {
  const limite = inicioRango(rango)
  if (limite === -Infinity) return sessions
  return sessions.filter((s) => {
    const t = Date.parse(s.fecha_inicio)
    return !isNaN(t) && t >= limite
  })
}

export function filtrarEventosPorRango(eventos: EventoRow[], rango: RangoFecha): EventoRow[] {
  const limite = inicioRango(rango)
  if (limite === -Infinity) return eventos
  return eventos.filter((e) => {
    const t = Date.parse(e.timestamp)
    return !isNaN(t) && t >= limite
  })
}

export interface EtapaEmbudo {
  etapa: string
  cantidad: number
}

export function contarEtapas(sessions: SessionRow[], eventos: EventoRow[]): EtapaEmbudo[] {
  const landingIds = new Set(eventos.filter((e) => e.evento === 'landing').map((e) => e.session_id))
  return [
    { etapa: 'Landing', cantidad: landingIds.size },
    { etapa: 'Nombre ingresado', cantidad: sessions.filter((s) => s.nombre.trim()).length },
    { etapa: 'Preguntas completas', cantidad: sessions.filter((s) => s.p8.trim()).length },
    { etapa: 'Formulario enviado', cantidad: sessions.filter((s) => s.whatsapp.trim()).length },
  ]
}

export interface DistribucionPerfil {
  perfil: string
  cantidad: number
}

export function distribucionPerfiles(sessions: SessionRow[]): DistribucionPerfil[] {
  const conteo = new Map<string, number>()
  sessions.filter(esCompletada).forEach((s) => {
    const key = s.perfil.trim()
    if (!key) return
    conteo.set(key, (conteo.get(key) || 0) + 1)
  })
  return Array.from(conteo.entries()).map(([perfil, cantidad]) => ({ perfil, cantidad }))
}

// Columnas disponibles para el panel de exportación (D). Las primeras
// coinciden con la tabla del grid (C3); el resto son columnas crudas del
// Sheet, disponibles pero apagadas por defecto.
export interface ColumnaExport {
  key: string
  label: string
  get: (s: SessionRow) => string
}

export const COLUMNAS_EXPORT: ColumnaExport[] = [
  { key: 'estado', label: 'Estado', get: (s) => calcularEstado(s) },
  { key: 'nombre', label: 'Nombre', get: (s) => s.nombre },
  { key: 'paso', label: 'Paso actual', get: (s) => s.paso },
  { key: 'perfil', label: 'Perfil', get: (s) => s.perfil },
  { key: 'whatsapp', label: 'WhatsApp', get: (s) => s.whatsapp },
  { key: 'tiempo_transcurrido', label: 'Tiempo transcurrido', get: (s) => tiempoTranscurrido(s.fecha_inicio) },
  { key: 'origen', label: 'Origen', get: (s) => s.origen },
  { key: 'dispositivo', label: 'Dispositivo', get: (s) => s.dispositivo },
  { key: 'fecha_inicio', label: 'Fecha inicio', get: (s) => formatFechaCorta(s.fecha_inicio) },
  { key: 'session_id', label: 'Session ID', get: (s) => s.session_id },
  { key: 'visitor_id', label: 'Visitor ID', get: (s) => s.visitor_id },
  { key: 'p1', label: 'P1', get: (s) => s.p1 },
  { key: 'p2', label: 'P2', get: (s) => s.p2 },
  { key: 'p3', label: 'P3', get: (s) => s.p3 },
  { key: 'p4', label: 'P4', get: (s) => s.p4 },
  { key: 'p5', label: 'P5', get: (s) => s.p5 },
  { key: 'p6', label: 'P6', get: (s) => s.p6 },
  { key: 'p7', label: 'P7', get: (s) => s.p7 },
  { key: 'p8', label: 'P8', get: (s) => s.p8 },
  { key: 'resultado_visto', label: 'Resultado visto', get: (s) => s.resultado_visto },
  { key: 'abandono_en', label: 'Abandonó en', get: (s) => s.abandono_en },
  { key: 'ultimo_update', label: 'Último update', get: (s) => s.ultimo_update },
  { key: 'cta_click', label: 'CTA click', get: (s) => s.cta_click },
  { key: 'tiempos_preguntas', label: 'Tiempos preguntas (seg)', get: (s) => s.tiempos_preguntas },
  { key: 'retomado', label: 'Retomado', get: (s) => s.retomado },
]

export const COLUMNAS_EXPORT_DEFAULT = new Set([
  'estado', 'nombre', 'paso', 'perfil', 'whatsapp', 'tiempo_transcurrido', 'origen', 'dispositivo', 'fecha_inicio',
])
