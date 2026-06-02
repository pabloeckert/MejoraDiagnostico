import type { PerfilKey } from './perfiles'

export function detectarPerfil(r: number[]): PerfilKey {
  const total = r.reduce((a, b) => a + b, 0)
  const promedio = total / 8

  // r[0]=P1 autonomía, r[1]=P2 comercial, r[2]=P3 objeción precio
  // r[3]=P4 equipo, r[4]=P5 procesos, r[5]=P6 asesores
  // r[6]=P7 visión, r[7]=P8 momento actual

  // 1. ESCEPTICO: desconfianza en asesores + estructura presente (no caos)
  if (r[5] <= 2 && r[0] >= 3 && total >= 22) return 'ESCEPTICO'

  // 2. EQUIPO DESALINEADO: equipo muy roto + dueño con algo de autonomía + puntaje medio-bajo
  if (r[3] === 1 && r[0] >= 2 && total <= 18) return 'EQUIPO_DESALINEADO'

  // 3. VENDEDOR SIN RESULTADOS: pierde ventas por precio + clientes llegan
  if (r[2] <= 2 && r[1] >= 3) return 'VENDEDOR_SIN_RESULTADOS'

  // 4. PROFESIONAL INVISIBLE: pierde ventas + buen momento actual + estructura
  if (r[2] <= 2 && r[7] >= 3 && total >= 18) return 'PROFESIONAL_INVISIBLE'

  // 5. NUEVA GENERACION: equipo medio + visión clara + liderazgo presente
  if (r[3] <= 2 && r[6] >= 3 && r[0] >= 3) return 'NUEVA_GENERACION'

  // 6. ORDEN PARA CRECER: momento caótico/sin estructura + puntaje medio-alto
  if (r[7] === 2 && total >= 18) return 'ORDEN_PARA_CRECER'

  // 7. LIDER SOLA: liderazgo presente + delega poco + estructura mínima
  if (r[0] >= 2 && r[4] <= 2 && total >= 16) return 'LIDER_SOLA'
  if (r[0] >= 3 && total >= 20) return 'LIDER_SOLA'

  // 8. EMPRENDEDOR SATURADO: alta dependencia del dueño + puntaje bajo-medio
  if (r[0] <= 2 && total <= 20) return 'EMPRENDEDOR_SATURADO'

  // FALLBACKS
  if (promedio <= 2)   return 'EMPRENDEDOR_SATURADO'
  if (promedio <= 2.5) return 'VENDEDOR_SIN_RESULTADOS'
  if (promedio <= 3)   return 'ORDEN_PARA_CRECER'
  return 'LIDER_SOLA'
}
