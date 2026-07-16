export const COLORES_MARCA = {
  azul: '#1A3D84',
  azulClaro: '#5B7CB8',
  rojo: '#E1061E',
  amarillo: '#F7CC13',
  tinta: '#2B2B2B',
  gris: '#6B7280',
  grisClaro: '#E5E7EB',
} as const

// Para gráficos con múltiples series (embudo, torta), ciclar SOLO estos 4 tonos.
export const PALETA_GRAFICOS = [
  COLORES_MARCA.azul,
  COLORES_MARCA.azulClaro,
  COLORES_MARCA.amarillo,
  COLORES_MARCA.rojo,
]
