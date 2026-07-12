import type { Scores, Area } from './scoring'

export const NOMBRES_AREA: Record<Area, string> = {
  personal: "Desarrollo Personal",
  organizacional: "Desarrollo Organizacional",
  comercial: "Desarrollo Comercial",
  empresarial: "Desarrollo Empresarial",
}

export function areasParaMostrar(scores: Scores): { nombre: string; porcentaje: number }[] {
  return (Object.keys(scores) as Area[]).map((area) => ({
    nombre: NOMBRES_AREA[area],
    porcentaje: scores[area],
  }))
}

export function zonaColor(p: number): { zona: string; color: string } {
  if (p < 40) return { zona: "Crítico",       color: "#E1061E" }
  if (p < 65) return { zona: "En desarrollo", color: "#F7CC13" }
  return              { zona: "Sólido",        color: "#1A3D84" }
}
