import type { PerfilKey } from './perfiles'

export function detectarPerfil(r: number[]): PerfilKey {
  const total = r.reduce((a, b) => a + b, 0)
  const promedio = total / 8

  if (r[5] <= 2 && total >= 16) return 'ESCEPTICO'
  if (r[3] === 1 && total <= 18) return 'EQUIPO_DESALINEADO'
  if (r[2] <= 2 && r[1] >= 3) return 'VENDEDOR_SIN_RESULTADOS'
  if (r[2] <= 2 && r[7] >= 3 && total >= 18) return 'PROFESIONAL_INVISIBLE'
  if (r[3] <= 2 && r[6] >= 3 && r[0] >= 3) return 'NUEVA_GENERACION'
  if (r[7] === 2 && total >= 18) return 'ORDEN_PARA_CRECER'
  if (r[0] >= 3 && r[3] <= 3 && total >= 20) return 'LIDER_SOLA'
  if (r[0] <= 2 && total <= 20) return 'EMPRENDEDOR_SATURADO'

  if (promedio <= 2) return 'EMPRENDEDOR_SATURADO'
  if (promedio <= 2.5) return 'VENDEDOR_SIN_RESULTADOS'
  if (promedio <= 3) return 'ORDEN_PARA_CRECER'
  return 'LIDER_SOLA'
}
