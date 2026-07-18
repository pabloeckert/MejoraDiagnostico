// Datos ficticios para el modo demo del dashboard admin. No representan leads reales.
import { PREGUNTAS } from './preguntas'
import type { SessionRow, EventoRow } from './admin'

const AHORA = Date.now()
const MIN = 60 * 1000
const HORA = 60 * MIN
const DIA = 24 * HORA

function hace(ms: number): string {
  return new Date(AHORA - ms).toISOString()
}

function resp(idx: number, valor: number): string {
  const op = PREGUNTAS[idx]?.opciones.find((o) => o.valor === valor)
  return op ? `${valor} — ${op.texto}` : ''
}

function ocho(valores: number[]): [string, string, string, string, string, string, string, string] {
  return valores.map((v, i) => resp(i, v)) as [string, string, string, string, string, string, string, string]
}

export const DATOS_DEMO: SessionRow[] = [
  // Completadas (4)
  (() => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = ocho([1, 2, 1, 2, 1, 1, 2, 1])
    return {
      session_id: 'demo_001', fecha_inicio: hace(5 * DIA), nombre: 'Marcos Duarte', whatsapp: '+5493761122334',
      perfil: 'SATURADO', paso: 'whatsapp_contactado', p1, p2, p3, p4, p5, p6, p7, p8,
      resultado_visto: 'SÍ', abandono_en: '', ultimo_update: hace(5 * DIA - 25 * MIN), cta_click: 'SÍ',
      visitor_id: 'demo_v_001', origen: 'instagram', dispositivo: 'Mobile',
      tiempos_preguntas: '14,9,12,8,15,10,11,13', retomado: 'NO',
    }
  })(),
  (() => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = ocho([2, 3, 2, 1, 2, 1, 2, 2])
    return {
      session_id: 'demo_002', fecha_inicio: hace(4 * DIA), nombre: 'Laura Benítez', whatsapp: '+5493764455667',
      perfil: 'LIDER_QUE_NECESITA_APOYO', paso: 'whatsapp_contactado', p1, p2, p3, p4, p5, p6, p7, p8,
      resultado_visto: 'SÍ', abandono_en: '', ultimo_update: hace(4 * DIA - 40 * MIN), cta_click: 'SÍ',
      visitor_id: 'demo_v_002', origen: 'directo', dispositivo: 'Desktop',
      tiempos_preguntas: '10,11,9,14,8,12,10,9', retomado: 'NO',
    }
  })(),
  (() => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = ocho([3, 4, 3, 3, 4, 3, 3, 4])
    return {
      session_id: 'demo_003', fecha_inicio: hace(3 * DIA), nombre: 'Ricardo Ayala', whatsapp: '+5493769988776',
      perfil: 'INDEPENDIENTE_EN_CRECIMIENTO', paso: 'whatsapp_contactado', p1, p2, p3, p4, p5, p6, p7, p8,
      resultado_visto: 'SÍ', abandono_en: '', ultimo_update: hace(3 * DIA - 18 * MIN), cta_click: 'SÍ',
      visitor_id: 'demo_v_003', origen: 'referido', dispositivo: 'Desktop',
      tiempos_preguntas: '9,10,8,7,11,9,10,8', retomado: 'NO',
    }
  })(),
  (() => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = ocho([1, 2, 2, 1, 2, 2, 1, 2])
    return {
      session_id: 'demo_004', fecha_inicio: hace(1 * DIA), nombre: 'Valeria Cardozo', whatsapp: '+5493762233445',
      perfil: 'EQUIPO_DESALINEADO', paso: 'whatsapp_contactado', p1, p2, p3, p4, p5, p6, p7, p8,
      resultado_visto: 'SÍ', abandono_en: '', ultimo_update: hace(1 * DIA - 30 * MIN), cta_click: 'SÍ',
      visitor_id: 'demo_v_004', origen: 'instagram', dispositivo: 'Mobile',
      tiempos_preguntas: '12,13,10,9,14,11,12,10', retomado: 'NO',
    }
  })(),

  // En curso (3)
  {
    session_id: 'demo_005', fecha_inicio: hace(8 * MIN), nombre: 'Julián Ferreyra', whatsapp: '',
    perfil: '', paso: 'pregunta_3', p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '',
    resultado_visto: 'NO', abandono_en: '', ultimo_update: hace(3 * MIN), cta_click: 'NO',
    visitor_id: 'demo_v_005', origen: 'directo', dispositivo: 'Mobile',
    tiempos_preguntas: '', retomado: 'NO',
  },
  {
    session_id: 'demo_006', fecha_inicio: hace(15 * MIN), nombre: 'Sofía Maldonado', whatsapp: '',
    perfil: '', paso: 'pregunta_6', p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '',
    resultado_visto: 'NO', abandono_en: '', ultimo_update: hace(2 * MIN), cta_click: 'NO',
    visitor_id: 'demo_v_006', origen: 'instagram', dispositivo: 'Desktop',
    tiempos_preguntas: '', retomado: 'NO',
  },
  {
    session_id: 'demo_007', fecha_inicio: hace(4 * MIN), nombre: 'Emiliano Godoy', whatsapp: '',
    perfil: '', paso: 'preguntas', p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '',
    resultado_visto: 'NO', abandono_en: '', ultimo_update: hace(1 * MIN), cta_click: 'NO',
    visitor_id: 'demo_v_007', origen: 'referido', dispositivo: 'Mobile',
    tiempos_preguntas: '', retomado: 'NO',
  },

  // Abandonadas (2)
  {
    session_id: 'demo_008', fecha_inicio: hace(3 * DIA), nombre: 'Camila Rojas', whatsapp: '',
    perfil: '', paso: 'pregunta_2', p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '',
    resultado_visto: 'NO', abandono_en: 'pregunta_2', ultimo_update: hace(3 * DIA - 5 * MIN), cta_click: 'NO',
    visitor_id: 'demo_v_008', origen: 'directo', dispositivo: 'Desktop',
    tiempos_preguntas: '', retomado: 'NO',
  },
  (() => {
    const [p1, p2, p3, p4, p5, p6, p7, p8] = ocho([2, 1, 2, 1, 1, 2, 1, 2])
    return {
      session_id: 'demo_009', fecha_inicio: hace(5 * DIA), nombre: 'Nahuel Ibarra', whatsapp: '',
      perfil: '', paso: 'formulario', p1, p2, p3, p4, p5, p6, p7, p8,
      resultado_visto: 'NO', abandono_en: 'formulario', ultimo_update: hace(5 * DIA - 12 * MIN), cta_click: 'NO',
      visitor_id: 'demo_v_009', origen: 'instagram', dispositivo: 'Mobile',
      tiempos_preguntas: '13,10,9,12,11,10,14,9', retomado: 'NO',
    }
  })(),

  // Retomada (1)
  {
    session_id: 'demo_010', fecha_inicio: hace(2 * DIA), nombre: 'Brenda Acosta', whatsapp: '',
    perfil: '', paso: 'retomado_pregunta_5', p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '',
    resultado_visto: 'NO', abandono_en: '', ultimo_update: hace(10 * MIN), cta_click: 'NO',
    visitor_id: 'demo_v_010', origen: 'referido', dispositivo: 'Desktop',
    tiempos_preguntas: '', retomado: 'SÍ',
  },
]

// Un evento 'landing' por cada sesión demo, más algunas visitas anónimas que
// nunca llegaron a ingresar su nombre — para que el embudo muestre caída real.
export const DATOS_DEMO_EVENTOS: EventoRow[] = [
  ...DATOS_DEMO.map((s) => ({
    timestamp: s.fecha_inicio,
    visitor_id: s.visitor_id,
    session_id: s.session_id,
    evento: 'landing',
    detalle: `${s.dispositivo} · ${s.origen}`,
  })),
  { timestamp: hace(6 * HORA), visitor_id: 'demo_v_011', session_id: 'demo_land_011', evento: 'landing', detalle: 'Mobile · instagram' },
  { timestamp: hace(1 * DIA + 3 * HORA), visitor_id: 'demo_v_012', session_id: 'demo_land_012', evento: 'landing', detalle: 'Desktop · directo' },
  { timestamp: hace(2 * DIA + 5 * HORA), visitor_id: 'demo_v_013', session_id: 'demo_land_013', evento: 'landing', detalle: 'Mobile · referido' },
]
