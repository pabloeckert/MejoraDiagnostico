import { areasMasDebiles, type Area, type Scores } from './scoring'
import { PERFILES, type PerfilKey } from './perfiles'
import { PREGUNTAS, type RespuestaPosicion } from './preguntas'

export type PrioridadIcp = 'ALTA' | 'MEDIA' | 'BAJA'

export interface SignalEvaluation {
  prioridad: PrioridadIcp
  puntajePromedio: number
  areaMinima: Area
  areaSecundaria: Area
  minScore: number
  preguntaMayorDudaIdx: number | null
  preguntaMayorDudaSeg: number
}

const ETIQUETA_AREA: Record<Area, string> = {
  personal: 'Personal / Foco del Líder',
  organizacional: 'Organizacional / Equipo',
  comercial: 'Comercial / Rentabilidad',
  empresarial: 'Empresarial / Procesos',
}

/**
 * Califica la prioridad e intención de un lead B2B según sus señales 4D y tiempos.
 */
export function evaluarSenalesIcp(
  scores: Scores,
  tiempos?: readonly number[]
): SignalEvaluation {
  const valores = Object.values(scores)
  const puntajePromedio = Math.round(valores.reduce((a, b) => a + b, 0) / Math.max(1, valores.length))
  const [areaMinima, areaSecundaria] = areasMasDebiles(scores)
  const minScore = scores[areaMinima]

  let preguntaMayorDudaIdx: number | null = null
  let preguntaMayorDudaSeg = 0
  let tiempoTotal = 0

  if (Array.isArray(tiempos) && tiempos.length > 0) {
    tiempos.forEach((seg, idx) => {
      const val = typeof seg === 'number' && Number.isFinite(seg) ? seg : 0
      tiempoTotal += val
      if (val > preguntaMayorDudaSeg) {
        preguntaMayorDudaSeg = val
        preguntaMayorDudaIdx = idx
      }
    })
  }

  let prioridad: PrioridadIcp = 'MEDIA'
  if (minScore <= 35 || (puntajePromedio < 52 && tiempoTotal >= 35)) {
    prioridad = 'ALTA'
  } else if (puntajePromedio >= 75 && minScore >= 55) {
    prioridad = 'BAJA'
  }

  return {
    prioridad,
    puntajePromedio,
    areaMinima,
    areaSecundaria,
    minScore,
    preguntaMayorDudaIdx,
    preguntaMayorDudaSeg,
  }
}

export interface BriefInput {
  nombre: string
  perfilKey: PerfilKey | string
  scores: Scores
  pregunta0Texto?: string
  pregunta0Dimension?: string
  posicion?: RespuestaPosicion | string
  tiempos?: readonly number[]
  utmSource?: string
}

/**
 * Genera el Pre-Brief operativo listo para la apertura comercial en WhatsApp (Sindy).
 */
export function construirBriefComercial(input: BriefInput): string {
  const senal = evaluarSenalesIcp(input.scores, input.tiempos)
  const perfilObj =
    input.perfilKey in PERFILES ? PERFILES[input.perfilKey as PerfilKey] : null
  const perfilTag = perfilObj?.tag || String(input.perfilKey)

  const dudaTexto =
    senal.preguntaMayorDudaIdx !== null && PREGUNTAS[senal.preguntaMayorDudaIdx]
      ? `P${senal.preguntaMayorDudaIdx + 1} (${senal.preguntaMayorDudaSeg}s): "${PREGUNTAS[senal.preguntaMayorDudaIdx].texto}"`
      : 'Sin tiempos registrados'

  const primerNombre = (input.nombre || '').trim().split(/\s+/)[0] || 'hola'
  const painDeclarado = input.pregunta0Texto?.trim()
    ? input.pregunta0Texto.trim()
    : ETIQUETA_AREA[senal.areaMinima]

  const guionApertura = `Hola ${primerNombre}, vi tu diagnóstico en Mejora Continua (${perfilTag}). Me llamó la atención que marcaste "${painDeclarado}" y el foco crítico en ${ETIQUETA_AREA[senal.areaMinima]}. ¿Tenés 10 minutos hoy o mañana para mostrarte dónde se está trabando el sistema?`

  return [
    `PRIORIDAD: ${senal.prioridad} (Promedio ${senal.puntajePromedio}%)`,
    `ARQUETIPO: ${perfilTag}${input.posicion ? ` · Rol: ${input.posicion}` : ''}`,
    `PAIN P0: ${input.pregunta0Texto || 'No declarado'}`,
    `CRÍTICAS: 1) ${ETIQUETA_AREA[senal.areaMinima]} (${input.scores[senal.areaMinima]}%) · 2) ${ETIQUETA_AREA[senal.areaSecundaria]} (${input.scores[senal.areaSecundaria]}%)`,
    `MAYOR VACILACIÓN: ${dudaTexto}`,
    `ORIGEN: ${input.utmSource || 'Directo'}`,
    `---`,
    `GUION SUGERIDO WHATSAPP:\n${guionApertura}`,
  ].join('\n')
}
