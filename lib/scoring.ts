import { PREGUNTAS, type RespuestaPosicion, type Area as AreaPregunta } from "./preguntas"

export type Area = "personal" | "organizacional" | "comercial" | "empresarial"
export type Scores = Record<Area, number>
export type PerfilKey =
  | "SATURADO"
  | "LIDER_QUE_NECESITA_APOYO"
  | "INDEPENDIENTE_EN_CRECIMIENTO"
  | "EQUIPO_DESALINEADO"
  | "ESCEPTICO"
  | "NUEVA_GENERACION"
  | "AREA_COMERCIAL_SIN_RESULTADOS"
  | "SIN_PROFESIONALIZAR_LA_EMPRESA"

export function calcularScores(respuestas: number[]): Scores {
  const scores: Scores = { personal: 0, organizacional: 0, comercial: 0, empresarial: 0 }
  const maxPorArea: Scores = { personal: 0, organizacional: 0, comercial: 0, empresarial: 0 }

  PREGUNTAS.forEach((p, i) => {
    const valor = respuestas[i] ?? 0
    const dom = p.areaDominante as Area
    const sec = p.areaSecundaria as Area
    scores[dom] += valor * 0.7
    scores[sec] += valor * 0.3
    maxPorArea[dom] += 4 * 0.7
    maxPorArea[sec] += 4 * 0.3
  })

  const normalizado: Scores = { personal: 0, organizacional: 0, comercial: 0, empresarial: 0 }
  for (const area of Object.keys(scores) as Area[]) {
    normalizado[area] = Math.round((scores[area] / maxPorArea[area]) * 100)
  }
  return normalizado
}

export function areasMasDebiles(scores: Scores): [Area, Area] {
  const ordenado = (Object.entries(scores) as [Area, number][]).sort((a, b) => a[1] - b[1])
  return [ordenado[0][0], ordenado[1][0]]
}

function estanParejas(scores: Scores, umbral = 12): boolean {
  const valores = Object.values(scores)
  return Math.max(...valores) - Math.min(...valores) <= umbral
}

const PARES_AMBIGUOS: [Area, Area][] = [
  ["personal", "organizacional"],
  ["organizacional", "personal"],
  ["comercial", "personal"],
  ["personal", "comercial"],
]

export function requierePosicion(scores: Scores): boolean {
  if (estanParejas(scores)) return false
  const [dom, sec] = areasMasDebiles(scores)
  return PARES_AMBIGUOS.some(([a, b]) => a === dom && b === sec)
}

export function detectarPerfil(scores: Scores, posicion?: RespuestaPosicion): PerfilKey {
  if (estanParejas(scores)) {
    const promedio = Object.values(scores).reduce((a, b) => a + b, 0) / 4
    return promedio < 50 ? "SIN_PROFESIONALIZAR_LA_EMPRESA" : "ESCEPTICO"
  }

  const [dom, sec] = areasMasDebiles(scores)

  if (dom === "empresarial" && sec === "personal") return "SATURADO"
  if (dom === "organizacional" && sec === "personal") return "EQUIPO_DESALINEADO"

  if ((dom === "personal" && sec === "organizacional") || (dom === "organizacional" && sec === "personal")) {
    if (posicion === "fundador") return "LIDER_QUE_NECESITA_APOYO"
    return "NUEVA_GENERACION"
  }

  if ((dom === "comercial" && sec === "personal") || (dom === "personal" && sec === "comercial")) {
    if (posicion === "fundador" || posicion === "heredero") return "AREA_COMERCIAL_SIN_RESULTADOS"
    return "INDEPENDIENTE_EN_CRECIMIENTO"
  }

  if (dom === "comercial") return "AREA_COMERCIAL_SIN_RESULTADOS"
  if (dom === "empresarial") return "SIN_PROFESIONALIZAR_LA_EMPRESA"
  return "EQUIPO_DESALINEADO"
}
