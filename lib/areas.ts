export const AREAS = [
  { nombre: "Liderazgo y Autonomía",  preguntas: [0, 3] },
  { nombre: "Desarrollo Comercial",   preguntas: [1, 2] },
  { nombre: "Procesos Internos",      preguntas: [4, 7] },
  { nombre: "Asesoramiento Externo",  preguntas: [5]    },
  { nombre: "Visión Estratégica",     preguntas: [6]    },
]

export function calcularAreas(respuestas: number[]): { nombre: string; porcentaje: number }[] {
  return AREAS.map((area) => {
    const vals = area.preguntas.map((i) => respuestas[i] ?? 0)
    const max = area.preguntas.length * 4
    const suma = vals.reduce((a, b) => a + b, 0)
    return { nombre: area.nombre, porcentaje: Math.round((suma / max) * 100) }
  })
}

export function zonaColor(p: number): { zona: string; color: string } {
  if (p < 40) return { zona: "Crítico",  color: "#C0392B" }
  if (p < 65) return { zona: "En desarrollo", color: "#E67E22" }
  return { zona: "Sólido", color: "#27AE60" }
}
