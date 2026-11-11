'use client'

import React, { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export interface PipelineLead {
  lead_id: string
  sesion_id: string
  etapa_kanban: string
  sla_limite_atencion: string
  motivo_descarte?: string
  notas_seguimiento?: string
  actualizado_en?: string
  nombre?: string
  whatsapp?: string
  arquetipo_calculado?: string
  score_personal?: number
  score_organizacional?: number
  score_comercial?: number
  score_empresarial?: number
  utm_source?: string
  ref_contacto?: string
  creado_en?: string
}

export interface LiveSession {
  sesion_id: string
  device_fingerprint?: string
  estado_funnel: string
  pregunta_maxima: number
  utm_source?: string
  ref_contacto?: string
  user_agent?: string
  creado_en: string
  actualizado_en: string
}

interface Props {
  initialLeads: PipelineLead[]
  liveSessions: LiveSession[]
  onSelectSession: (sessionId: string) => void
}

interface ColumnConfig {
  id: string
  titulo: string
  colorBadge: string
  etapaKey?: string
}

const COLUMNAS: ColumnConfig[] = [
  { id: 'en_vivo', titulo: '1. EN VIVO', colorBadge: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  { id: 'completado', titulo: '2. COMPLETADO', colorBadge: 'bg-blue-500/15 text-blue-700 border-blue-300', etapaKey: 'COMPLETADO_SIN_CONTACTO' },
  { id: 'en_contacto', titulo: '3. EN CONTACTO', colorBadge: 'bg-amber-500/15 text-amber-700 border-amber-300', etapaKey: 'EN_CONTACTO_WHATSAPP' },
  { id: 'reunion_agendada', titulo: '4. REUNIÓN AG.', colorBadge: 'bg-purple-500/15 text-purple-700 border-purple-300', etapaKey: 'REUNION_AGENDADA' },
  { id: 'cerrado', titulo: '5. CERRADO', colorBadge: 'bg-green-600/15 text-green-800 border-green-400', etapaKey: 'CERRADO_GANADO' },
]

function calcularSLA(limiteIso: string): { horasRestantes: number; claseSemaforo: string; texto: string } {
  if (!limiteIso) return { horasRestantes: 48, claseSemaforo: 'text-gray-500 bg-gray-100', texto: 'SLA: 48h' }
  const limite = new Date(limiteIso).getTime()
  const ahora = Date.now()
  const diffMs = limite - ahora
  const horasRestantes = Math.round(diffMs / (1000 * 60 * 60))

  if (diffMs <= 0) {
    return {
      horasRestantes: 0,
      claseSemaforo: 'text-red-700 bg-red-100 border border-red-300 animate-pulse font-bold',
      texto: '🚨 SLA VENCIDO',
    }
  }
  if (horasRestantes < 8) {
    return {
      horasRestantes,
      claseSemaforo: 'text-red-700 bg-red-100 border border-red-300 animate-pulse font-bold',
      texto: `SLA: ${horasRestantes}h rest.`,
    }
  }
  if (horasRestantes < 24) {
    return {
      horasRestantes,
      claseSemaforo: 'text-amber-800 bg-amber-100 border border-amber-300 font-semibold',
      texto: `SLA: ${horasRestantes}h rest.`,
    }
  }
  return {
    horasRestantes,
    claseSemaforo: 'text-emerald-800 bg-emerald-100 border border-emerald-300 font-semibold',
    texto: `SLA: ${horasRestantes}h rest.`,
  }
}

function tiempoTranscurridoVivo(isoDate: string): string {
  if (!isoDate) return '0s'
  const ms = Date.now() - new Date(isoDate).getTime()
  const seg = Math.max(1, Math.floor(ms / 1000))
  if (seg < 60) return `${seg}s`
  const min = Math.floor(seg / 60)
  return `${min}m ${seg % 60}s`
}

export default function KanbanBoard({ initialLeads, liveSessions, onSelectSession }: Props) {
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sincronizar si entran nuevos leads desde polling externo
  React.useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Buscar columna destino
    const targetCol = COLUMNAS.find(c => c.id === destination.droppableId)
    if (!targetCol || !targetCol.etapaKey) return

    const nuevaEtapa = targetCol.etapaKey

    // Optimistic Update
    const previousLeads = [...leads]
    setLeads(prev =>
      prev.map(l => (l.lead_id === draggableId || l.sesion_id === draggableId ? { ...l, etapa_kanban: nuevaEtapa } : l))
    )

    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/pipeline/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: draggableId,
          nuevaEtapa,
        }),
      })
      if (!res.ok) throw new Error('Error al mover tarjeta')
    } catch (e) {
      console.error('[Kanban] Revertiendo movimiento por error:', e)
      setLeads(previousLeads)
    } finally {
      setIsUpdating(false)
    }
  }

  // Filtrado de leads por columna
  const leadsPorColumna = (colId: string) => {
    const col = COLUMNAS.find(c => c.id === colId)
    if (!col || !col.etapaKey) return []
    return leads.filter(l => l.etapa_kanban === col.etapaKey)
  }

  // Métricas de encabezado
  const totalHoy = leads.length + liveSessions.length
  const totalCompletados = leads.filter(l => l.etapa_kanban !== 'EN_CURSO').length
  const enWhatsApp = leads.filter(l => l.etapa_kanban === 'EN_CONTACTO_WHATSAPP').length
  const slaVencidos = leads.filter(l => {
    const { horasRestantes } = calcularSLA(l.sla_limite_atencion)
    return horasRestantes === 0 && l.etapa_kanban === 'COMPLETADO_SIN_CONTACTO'
  }).length

  return (
    <div className="flex flex-col gap-6">
      {/* Banner Superior de Centro de Mando */}
      <div className="bg-mc-azul-marino text-white p-5 rounded-lg shadow-sm border border-mc-azul flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h2 className="text-lg font-bold tracking-wide">CENTRO DE MANDO · MEJORADIAGNOSTICO</h2>
            <p className="text-xs text-gray-300">Monitoreo de Embudo 4D & Control de SLA Comercial</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="bg-white/10 px-3 py-1.5 rounded">
            <span className="text-gray-300">Sesiones: </span>
            <strong className="text-white text-sm">{totalHoy}</strong>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded">
            <span className="text-gray-300">Completados: </span>
            <strong className="text-emerald-300 text-sm">{totalCompletados}</strong>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded">
            <span className="text-gray-300">En WhatsApp: </span>
            <strong className="text-blue-300 text-sm">{enWhatsApp}</strong>
          </div>
          <div className={`px-3 py-1.5 rounded border ${slaVencidos > 0 ? 'bg-red-500/20 text-red-200 border-red-500 animate-pulse' : 'bg-white/10 text-gray-300 border-transparent'}`}>
            <span>SLA Vencidos: </span>
            <strong className="text-sm">{slaVencidos}</strong>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/30 text-[11px] font-mono text-emerald-400 border border-emerald-500/30">
            <span>●</span> SQLite WAL Soberano
          </div>
        </div>
      </div>

      {/* Tablero Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {COLUMNAS.map(col => {
            const isLive = col.id === 'en_vivo'
            const colLeads = isLive ? [] : leadsPorColumna(col.id)

            return (
              <div
                key={col.id}
                className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-3 flex flex-col min-h-[550px] max-h-[800px]"
              >
                {/* Cabecera de Columna */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-mc-negro">
                      {col.titulo}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.colorBadge}`}>
                    {isLive ? liveSessions.length : colLeads.length}
                  </span>
                </div>

                {/* Contenedor de Tarjetas */}
                {isLive ? (
                  /* Columna 1: Tarjetas en Vivo (No arrastrables) */
                  <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
                    {liveSessions.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-xs italic">
                        Sin usuarios activos en este momento
                      </div>
                    ) : (
                      liveSessions.map(s => (
                        <div
                          key={s.sesion_id}
                          onClick={() => onSelectSession(s.sesion_id)}
                          className="bg-white p-3 rounded-md border border-emerald-300 shadow-sm hover:border-emerald-500 transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              Sesión #{s.sesion_id.slice(0, 6)}
                            </span>
                            <span className="font-mono text-gray-500">
                              {tiempoTranscurridoVivo(s.creado_en)}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-mc-negro mb-1">
                            {s.pregunta_maxima === 0
                              ? 'En Pregunta Cero'
                              : `Pregunta ${s.pregunta_maxima} de 8`}
                          </div>

                          <div className="text-[11px] text-gray-500 truncate">
                            Origen: {s.utm_source || s.ref_contacto || 'Directo'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Columnas 2 a 5: Arrastrables con Droppable */
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 transition-colors rounded-md p-1 ${
                          snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {colLeads.length === 0 ? (
                          <div className="text-center py-12 text-gray-400 text-xs italic">
                            Sin prospectos en esta etapa
                          </div>
                        ) : (
                          colLeads.map((lead, index) => {
                            const sla = calcularSLA(lead.sla_limite_atencion)
                            const scorePromedio = Math.round(
                              ((lead.score_personal || 0) +
                                (lead.score_organizacional || 0) +
                                (lead.score_comercial || 0) +
                                (lead.score_empresarial || 0)) /
                                4
                            )

                            return (
                              <Draggable
                                key={lead.lead_id || lead.sesion_id}
                                draggableId={lead.lead_id || lead.sesion_id}
                                index={index}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    onClick={() => onSelectSession(lead.sesion_id)}
                                    className={`bg-white p-3.5 rounded-md border text-left shadow-sm transition-shadow cursor-grab active:cursor-grabbing hover:shadow-md ${
                                      dragSnapshot.isDragging
                                        ? 'border-mc-azul shadow-lg rotate-1'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {/* Nombre + Arquetipo */}
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <h4 className="font-bold text-sm text-mc-negro truncate">
                                        {lead.nombre || 'Prospecto sin nombre'}
                                      </h4>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-mc-azul/10 text-mc-azul shrink-0">
                                        {lead.arquetipo_calculado || 'SATURADO'}
                                      </span>
                                    </div>

                                    {/* Score y SLA */}
                                    <div className="flex items-center justify-between text-xs my-2">
                                      <span className="font-semibold text-gray-600">
                                        Score: <strong className="text-mc-negro">{scorePromedio}%</strong>
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sla.claseSemaforo}`}>
                                        {sla.texto}
                                      </span>
                                    </div>

                                    {/* Teléfono / WhatsApp Link */}
                                    {lead.whatsapp && (
                                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-mono text-[11px] truncate max-w-[120px]">
                                          {lead.whatsapp}
                                        </span>
                                        <a
                                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                                        >
                                          WhatsApp ↗
                                        </a>
                                      </div>
                                    )}

                                    {/* Indicador sutil de arrastre */}
                                    <div className="text-[10px] text-gray-300 text-right mt-1.5 select-none">
                                      ⠿ Arrastrar
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            )
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
