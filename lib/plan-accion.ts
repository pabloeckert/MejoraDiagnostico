import { areasMasDebiles, type Area, type Scores } from './scoring'
import type { PerfilKey } from './perfiles'
import type { RespuestaPosicion } from './preguntas'

export interface Paso72h {
  dia: string
  titulo: string
  accion: string
}

export interface PlanAccion72h {
  lecturaOrigen: string
  enfoqueRol: string
  pasos: Paso72h[]
}

const DIAGNOSTICO_ORIGEN_DIMENSION: Record<Area, string> = {
  personal:
    'tu tiempo de dirección está absorbido por urgencias operativas que deberían resolverse sin vos',
  organizacional:
    'las responsabilidades dentro del equipo no tienen reglas claras de decisión y todo sube a tu escritorio',
  comercial:
    'el esfuerzo comercial depende de empuje individual o concesiones de precio, sin método repetible',
  empresarial:
    'el negocio creció apoyado en criterio artesanal y hoy exige estructura de procesos para sostenerse',
}

const ACCIONES_POR_AREA: Record<Area, [Paso72h, Paso72h]> = {
  personal: [
    {
      dia: 'Primeras 24h',
      titulo: 'Auditar interrupciones repetitivas',
      accion:
        'Anotá durante un día cada consulta operativa que te llega. Marcá cuáles ya explicaste más de dos veces: ese es tu primer proceso faltante, no una falla de voluntad.',
    },
    {
      dia: '48 a 72h',
      titulo: 'Fijar ventana protegida de criterio',
      accion:
        'Bloqueá 90 minutos sin teléfono ni escritorio abierto para revisar indicadores y definir una sola decisión de orden para la semana.',
    },
  ],
  organizacional: [
    {
      dia: 'Primeras 24h',
      titulo: 'Separar tarea de responsabilidad',
      accion:
        'Elegí los 3 frentes que hoy vuelven siempre a vos y asigná un único responsable explícito con criterio claro de qué puede resolver solo y qué escala.',
    },
    {
      dia: '48 a 72h',
      titulo: 'Instalar reunión breve de alineación',
      accion:
        'Reemplazá el seguimiento informal de pasillo por una revisión de 20 minutos con 3 datos visibles: qué se comprometió, qué trabó y qué cambia.',
    },
  ],
  comercial: [
    {
      dia: 'Primeras 24h',
      titulo: 'Medir concentración y margen real',
      accion:
        'Listá tus últimos 10 presupuestos o clientes principales. Identificá dónde cediste condiciones por miedo a perder la venta y cuánto depende tu caja de 1 o 2 cuentas.',
    },
    {
      dia: '48 a 72h',
      titulo: 'Definir piso comercial no negociable',
      accion:
        'Escribí en media hoja tus 3 criterios mínimos de precio, plazo y alcance para que vender deje de ser una apuesta caso por caso.',
    },
  ],
  empresarial: [
    {
      dia: 'Primeras 24h',
      titulo: 'Mapear el cuello de botella recurrente',
      accion:
        'Elegí el problema operativo que se repitió en las últimas dos semanas y escribí el paso a paso mínimo para que cualquiera del equipo lo ejecute igual.',
    },
    {
      dia: '48 a 72h',
      titulo: 'Bajar un tablero mínimo de control',
      accion:
        'Definí 4 números semanales (caja, ventas cerradas, entregas a tiempo y reclamos) para dirigir con datos reales y no por sensación del día.',
    },
  ],
}

const ENFOQUE_POSICION: Record<RespuestaPosicion, string> = {
  fundador:
    'Como fundador, el desafío no es trabajar más horas: es convertir tu criterio personal en sistema para que la empresa no dependa de tu presencia física.',
  heredero:
    'En transición generacional, ordenar procesos objetivos es la única forma de que tu autoridad se apoye en resultados medibles y no en discusiones personales.',
  gerente:
    'Desde un rol directivo sin propiedad total, el orden metodológico respalda tus decisiones con hechos concretos frente a socios y equipo.',
}

/**
 * Construye el diagnóstico contextualizado y el Plan de Primeras 72 Horas alineado al Manifiesto.
 */
export function generarPlanAccion72h(params: {
  perfil: PerfilKey
  scores: Scores
  pregunta0Texto?: string
  pregunta0Dimension?: string
  posicion?: RespuestaPosicion
}): PlanAccion72h {
  const [debil1, debil2] = areasMasDebiles(params.scores)
  const painTexto = params.pregunta0Texto?.trim()

  const lecturaOrigen = painTexto
    ? `Al empezar marcaste "${painTexto}". El cruce de tus 8 respuestas confirma que el freno no es falta de esfuerzo: ${DIAGNOSTICO_ORIGEN_DIMENSION[debil1]}.`
    : `Tus respuestas muestran que la traba principal no es capacidad personal, sino diseño operativo: ${DIAGNOSTICO_ORIGEN_DIMENSION[debil1]}.`

  const enfoqueRol = params.posicion
    ? ENFOQUE_POSICION[params.posicion]
    : 'El problema nunca sos vos ni las personas: cuando el proceso no existe, el negocio te cobra cada decisión con desgaste diario.'

  const [p1, p2] = ACCIONES_POR_AREA[debil1]
  const [sec1] = ACCIONES_POR_AREA[debil2]

  const pasos: Paso72h[] = [
    p1,
    {
      dia: 'Día 2 · Área crítica secundaria',
      titulo: sec1.titulo,
      accion: sec1.accion,
    },
    p2,
  ]

  return { lecturaOrigen, enfoqueRol, pasos }
}
