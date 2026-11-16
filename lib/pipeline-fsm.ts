/**
 * Máquina de estados finitos (FSM) y reglas SLA del Pipeline Comercial B2B.
 * Capa de dominio pura: sin dependencias de React, red o base de datos.
 */

export const ETAPAS_PIPELINE = [
  'COMPLETADO_SIN_CONTACTO',
  'EN_CONTACTO_WHATSAPP',
  'REUNION_AGENDADA',
  'PROPUESTA_ENVIADA',
  'CERRADO_GANADO',
  'DESCARTADO',
] as const

export type PipelineStage = (typeof ETAPAS_PIPELINE)[number]

export interface KanbanColumnDef {
  id: string
  titulo: string
  colorBadge: string
  etapaKey?: PipelineStage
}

export const KANBAN_COLUMNAS_ACTIVAS: readonly KanbanColumnDef[] = [
  {
    id: 'en_vivo',
    titulo: '1. EN VIVO',
    colorBadge: 'bg-emerald-500/15 text-emerald-800 border-emerald-300',
  },
  {
    id: 'completado',
    titulo: '2. COMPLETADO',
    colorBadge: 'bg-[#1A3D84]/10 text-[#1A3D84] border-[#1A3D84]/30',
    etapaKey: 'COMPLETADO_SIN_CONTACTO',
  },
  {
    id: 'en_contacto',
    titulo: '3. EN CONTACTO',
    colorBadge: 'bg-[#F7CC13] text-[#2B2B2B] border-amber-400',
    etapaKey: 'EN_CONTACTO_WHATSAPP',
  },
  {
    id: 'reunion_agendada',
    titulo: '4. REUNIÓN AG.',
    colorBadge: 'bg-purple-500/15 text-purple-800 border-purple-300',
    etapaKey: 'REUNION_AGENDADA',
  },
  {
    id: 'propuesta',
    titulo: '5. PROPUESTA',
    colorBadge: 'bg-indigo-500/15 text-indigo-800 border-indigo-300',
    etapaKey: 'PROPUESTA_ENVIADA',
  },
  {
    id: 'cerrado',
    titulo: '6. CERRADO',
    colorBadge: 'bg-emerald-600/15 text-emerald-900 border-emerald-400',
    etapaKey: 'CERRADO_GANADO',
  },
] as const

export function esEtapaValida(valor: string): valor is PipelineStage {
  return (ETAPAS_PIPELINE as readonly string[]).includes(valor)
}

export function esTransicionValida(desde: PipelineStage | undefined, hacia: PipelineStage): boolean {
  if (!esEtapaValida(hacia)) return false
  if (!desde) return true
  if (desde === hacia) return false
  return true
}

export interface SlaEvaluacion {
  horasRestantes: number
  nivel: 'verde' | 'amarillo' | 'rojo' | 'cerrado'
  claseSemaforo: string
  texto: string
  vencido: boolean
}

/**
 * Evalúa el SLA comercial innegociable de 48h conforme a SKILL_UXUI.md (WCAG 2.2 AA).
 */
export function evaluarSla48h(
  limiteIso: string,
  etapa?: string,
  ahoraMs: number = Date.now()
): SlaEvaluacion {
  if (etapa === 'CERRADO_GANADO') {
    return {
      horasRestantes: 48,
      nivel: 'cerrado',
      claseSemaforo: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold',
      texto: 'Ganado ✓',
      vencido: false,
    }
  }
  if (etapa === 'DESCARTADO') {
    return {
      horasRestantes: 48,
      nivel: 'cerrado',
      claseSemaforo: 'bg-gray-100 text-[#6B7280] border border-gray-300 font-medium',
      texto: 'Descartado',
      vencido: false,
    }
  }
  if (!limiteIso) {
    return {
      horasRestantes: 48,
      nivel: 'verde',
      claseSemaforo: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold',
      texto: 'SLA: 48h',
      vencido: false,
    }
  }

  const limite = new Date(limiteIso).getTime()
  if (Number.isNaN(limite)) {
    return {
      horasRestantes: 48,
      nivel: 'verde',
      claseSemaforo: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold',
      texto: 'SLA: 48h',
      vencido: false,
    }
  }

  const diffMs = limite - ahoraMs
  const horasRestantes = Math.round(diffMs / (1000 * 60 * 60))

  if (diffMs <= 0) {
    return {
      horasRestantes: 0,
      nivel: 'rojo',
      claseSemaforo: 'bg-[#E1061E] text-white border border-[#E1061E] animate-pulse font-bold',
      texto: '🚨 SLA VENCIDO',
      vencido: true,
    }
  }

  if (horasRestantes < 24) {
    return {
      horasRestantes,
      nivel: horasRestantes < 8 ? 'rojo' : 'amarillo',
      claseSemaforo:
        horasRestantes < 8
          ? 'bg-[#E1061E] text-white border border-[#E1061E] font-bold'
          : 'bg-[#F7CC13] text-[#2B2B2B] border border-amber-500 font-semibold',
      texto: `SLA: ${horasRestantes}h rest.`,
      vencido: false,
    }
  }

  return {
    horasRestantes,
    nivel: 'verde',
    claseSemaforo: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold',
    texto: `SLA: ${horasRestantes}h rest.`,
    vencido: false,
  }
}
