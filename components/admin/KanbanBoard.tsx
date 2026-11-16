'use client'

import React, { useEffect, useRef, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  ETAPAS_PIPELINE,
  KANBAN_COLUMNAS_ACTIVAS,
  evaluarSla48h,
  type PipelineStage,
} from '@/lib/pipeline-fsm'
import { PERFILES, type PerfilKey } from '@/lib/perfiles'

export interface PipelineLead {
  lead_id: string
  sesion_id: string
  etapa_kanban: string
  sla_limite_atencion: string
  prioridad_icp?: string
  brief_comercial?: string
  motivo_descarte?: string
  notas_seguimiento?: string
  actualizado_en?: string
  nombre?: string
  whatsapp?: string
  arquetipo_calculado?: string
  pregunta_0_texto?: string
  pregunta_0_dimension?: string
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
  pregunta_0_texto?: string
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
  onLeadMutated?: () => void
}

interface UndoToastState {
  leadId: string
  nombre: string
  fromEtapa: PipelineStage
  toEtapa: PipelineStage
  secondsLeft: number
}

const ETAPA_LABEL: Record<string, string> = {
  COMPLETADO_SIN_CONTACTO: 'Completado (Sin contacto)',
  EN_CONTACTO_WHATSAPP: 'En contacto WhatsApp',
  REUNION_AGENDADA: 'Reunión agendada',
  PROPUESTA_ENVIADA: 'Propuesta enviada',
  CERRADO_GANADO: 'Cerrado ganado',
  DESCARTADO: 'Descartado',
}

function tiempoTranscurridoVivo(isoDate: string): string {
  if (!isoDate) return '0s'
  const ms = Date.now() - new Date(isoDate).getTime()
  const seg = Math.max(1, Math.floor(ms / 1000))
  if (seg < 60) return `${seg}s`
  const min = Math.floor(seg / 60)
  return `${min}m ${seg % 60}s`
}

function PrioridadBadge({ prioridad }: { prioridad?: string }) {
  if (prioridad === 'ALTA') {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E1061E] text-white shrink-0">
        🔥 ALTA
      </span>
    )
  }
  if (prioridad === 'BAJA') {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-[#6B7280] shrink-0">
        EXPLORATORIA
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F7CC13] text-[#2B2B2B] shrink-0">
      MEDIA
    </span>
  )
}

export default function KanbanBoard({
  initialLeads,
  liveSessions,
  onSelectSession,
  onLeadMutated,
}: Props) {
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads)
  const [isMounted, setIsMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [mostrarDescartados, setMostrarDescartados] = useState(false)
  const [editingLead, setEditingLead] = useState<PipelineLead | null>(null)
  const [editNotas, setEditNotas] = useState('')
  const [editDescarte, setEditDescarte] = useState('')
  const [editEtapa, setEditEtapa] = useState<PipelineStage>('COMPLETADO_SIN_CONTACTO')
  const [savingModal, setSavingModal] = useState(false)
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null)
  const [moveError, setMoveError] = useState('')

  const pendingLeadIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Evita que el polling de 20s pise mutaciones optimistas en vuelo
  useEffect(() => {
    setLeads((prev) => {
      if (pendingLeadIdsRef.current.size === 0) return initialLeads
      const pendingById = new Map(
        prev
          .filter((l) => pendingLeadIdsRef.current.has(l.lead_id))
          .map((l) => [l.lead_id, l])
      )
      return initialLeads.map((l) => pendingById.get(l.lead_id) || l)
    })
  }, [initialLeads])

  // Temporizador de 10 segundos para Toast Undo
  useEffect(() => {
    if (!undoToast) return
    if (undoToast.secondsLeft <= 0) {
      setUndoToast(null)
      return
    }
    const timer = setTimeout(() => {
      setUndoToast((cur) => (cur ? { ...cur, secondsLeft: cur.secondsLeft - 1 } : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [undoToast])

  const persistLeadMove = async (params: {
    leadId: string
    nuevaEtapa: PipelineStage
    notas?: string
    motivoDescarte?: string
    fromEtapa?: PipelineStage
    leadNombre?: string
    showUndo?: boolean
  }) => {
    const previousLeads = [...leads]
    pendingLeadIdsRef.current.add(params.leadId)
    setMoveError('')

    setLeads((prev) =>
      prev.map((l) =>
        l.lead_id === params.leadId || l.sesion_id === params.leadId
          ? {
              ...l,
              etapa_kanban: params.nuevaEtapa,
              notas_seguimiento:
                params.notas !== undefined ? params.notas : l.notas_seguimiento,
              motivo_descarte:
                params.motivoDescarte !== undefined
                  ? params.motivoDescarte
                  : l.motivo_descarte,
            }
          : l
      )
    )

    setIsUpdating(true)
    try {
      const res = await fetch('/api/admin/pipeline/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.leadId,
          nuevaEtapa: params.nuevaEtapa,
          notas: params.notas,
          motivoDescarte: params.motivoDescarte,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      if (params.showUndo && params.fromEtapa && params.fromEtapa !== params.nuevaEtapa) {
        setUndoToast({
          leadId: params.leadId,
          nombre: params.leadNombre || 'Lead',
          fromEtapa: params.fromEtapa,
          toEtapa: params.nuevaEtapa,
          secondsLeft: 10,
        })
      }
      onLeadMutated?.()
    } catch (e) {
      console.error('[Kanban] Revertiendo movimiento por error:', e)
      setLeads(previousLeads)
      setMoveError('No se pudo guardar el cambio en el servidor. Se revirtió el movimiento.')
    } finally {
      pendingLeadIdsRef.current.delete(params.leadId)
      setIsUpdating(false)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const targetCol = KANBAN_COLUMNAS_ACTIVAS.find((c) => c.id === destination.droppableId)
    const sourceCol = KANBAN_COLUMNAS_ACTIVAS.find((c) => c.id === source.droppableId)
    if (!targetCol?.etapaKey) return

    const leadActual = leads.find(
      (l) => l.lead_id === draggableId || l.sesion_id === draggableId
    )
    await persistLeadMove({
      leadId: draggableId,
      nuevaEtapa: targetCol.etapaKey,
      fromEtapa: (sourceCol?.etapaKey || leadActual?.etapa_kanban) as PipelineStage | undefined,
      leadNombre: leadActual?.nombre,
      showUndo: true,
    })
  }

  const handleOpenEditLead = (lead: PipelineLead, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLead(lead)
    setEditNotas(lead.notas_seguimiento || '')
    setEditDescarte(lead.motivo_descarte || '')
    setEditEtapa(
      (ETAPAS_PIPELINE.includes(lead.etapa_kanban as PipelineStage)
        ? lead.etapa_kanban
        : 'COMPLETADO_SIN_CONTACTO') as PipelineStage
    )
  }

  const handleSaveLeadModal = async () => {
    if (!editingLead) return
    setSavingModal(true)
    await persistLeadMove({
      leadId: editingLead.lead_id,
      nuevaEtapa: editEtapa,
      notas: editNotas,
      motivoDescarte: editDescarte,
      fromEtapa: editingLead.etapa_kanban as PipelineStage,
      leadNombre: editingLead.nombre,
      showUndo: editEtapa !== editingLead.etapa_kanban,
    })
    setSavingModal(false)
    setEditingLead(null)
  }

  const handleCopyBrief = (lead: PipelineLead, e: React.MouseEvent) => {
    e.stopPropagation()
    const brief =
      lead.brief_comercial ||
      `Hola ${lead.nombre || ''}, vi tu Diagnóstico Empresarial en Mejora Continua (${lead.arquetipo_calculado || 'Diagnóstico 4D'}). ¿Tenés 10 min para revisar dónde se está trabando el sistema?`
    navigator.clipboard?.writeText(brief).then(() => {
      setCopiedId(lead.lead_id)
      setTimeout(() => setCopiedId((cur) => (cur === lead.lead_id ? null : cur)), 2000)
    })
  }

  const leadsPorColumna = (colId: string) => {
    const col = KANBAN_COLUMNAS_ACTIVAS.find((c) => c.id === colId)
    if (!col?.etapaKey) return []
    return leads.filter((l) => l.etapa_kanban === col.etapaKey)
  }

  const leadsDescartados = leads.filter((l) => l.etapa_kanban === 'DESCARTADO')

  const totalHoy = leads.length + liveSessions.length
  const totalCompletados = leads.filter((l) => l.etapa_kanban !== 'DESCARTADO').length
  const enWhatsApp = leads.filter((l) => l.etapa_kanban === 'EN_CONTACTO_WHATSAPP').length
  const slaVencidos = leads.filter((l) => {
    if (l.etapa_kanban !== 'COMPLETADO_SIN_CONTACTO') return false
    return evaluarSla48h(l.sla_limite_atencion, l.etapa_kanban).vencido
  }).length

  return (
    <div className="flex flex-col gap-5">
      {/* Banner Centro de Mando */}
      <div className="bg-mc-azul-marino text-white p-5 rounded-lg shadow-sm border border-mc-azul flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <h2 className="text-lg font-bold tracking-wide">
              CENTRO DE MANDO COMERCIAL · SLA 48H
            </h2>
            <p className="text-xs text-gray-300">
              Arrastrá tarjetas entre columnas o abrí el Brief WhatsApp en 1 clic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="bg-white/10 px-3 py-2 rounded">
            <span className="text-gray-300">Sesiones: </span>
            <strong className="text-white text-sm">{totalHoy}</strong>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded">
            <span className="text-gray-300">Activos: </span>
            <strong className="text-emerald-300 text-sm">{totalCompletados}</strong>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded">
            <span className="text-gray-300">En WhatsApp: </span>
            <strong className="text-blue-300 text-sm">{enWhatsApp}</strong>
          </div>
          <div
            className={`px-3 py-2 rounded border ${
              slaVencidos > 0
                ? 'bg-[#E1061E] text-white border-red-300 animate-pulse'
                : 'bg-white/10 text-gray-200 border-transparent'
            }`}
          >
            <span>SLA Vencidos: </span>
            <strong className="text-sm">{slaVencidos}</strong>
          </div>
          {leadsDescartados.length > 0 && (
            <button
              onClick={() => setMostrarDescartados((v) => !v)}
              className="min-h-[44px] px-3 py-2 rounded bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              {mostrarDescartados
                ? `Ocultar descartados (${leadsDescartados.length})`
                : `Ver descartados (${leadsDescartados.length})`}
            </button>
          )}
        </div>
      </div>

      {moveError && (
        <div className="p-3 rounded bg-red-50 border border-[#E1061E] text-[#E1061E] text-sm font-semibold">
          {moveError}
        </div>
      )}

      {/* Tablero Kanban (6 Columnas: En Vivo + 5 Etapas Activas) */}
      {!isMounted ? (
        <div className="p-8 text-center text-sm text-mc-gris bg-white rounded-lg border border-gray-200">
          Inicializando tablero interactivo…
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3.5 items-start">
            {KANBAN_COLUMNAS_ACTIVAS.map((col) => {
              const isLive = col.id === 'en_vivo'
              const colLeads = isLive ? [] : leadsPorColumna(col.id)

              return (
                <div
                  key={col.id}
                  className="bg-gray-100/80 border border-gray-200 rounded-lg p-3 flex flex-col min-h-[520px] max-h-[820px]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-mc-negro">
                      {col.titulo}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.colorBadge}`}
                    >
                      {isLive ? liveSessions.length : colLeads.length}
                    </span>
                  </div>

                  {isLive ? (
                    <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
                      {liveSessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-xs italic">
                          Sin usuarios activos en los últimos 30m
                        </div>
                      ) : (
                        liveSessions.map((s) => (
                          <div
                            key={s.sesion_id}
                            onClick={() => onSelectSession(s.sesion_id)}
                            className="bg-white p-3 rounded-md border border-emerald-400 shadow-sm hover:border-emerald-600 transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                #{s.sesion_id.slice(0, 6)}
                              </span>
                              <span className="font-mono text-gray-600">
                                {tiempoTranscurridoVivo(s.creado_en)}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-mc-negro mb-1">
                              {s.pregunta_maxima === 0
                                ? 'En Pregunta Cero'
                                : `Pregunta ${s.pregunta_maxima} de 8`}
                            </div>
                            {s.pregunta_0_texto && (
                              <div className="text-[11px] text-mc-azul bg-blue-50 px-2 py-1 rounded mb-1 line-clamp-2">
                                ⚡ {s.pregunta_0_texto}
                              </div>
                            )}
                            <div className="text-[11px] text-gray-600 truncate">
                              Origen: {s.utm_source || s.ref_contacto || 'Directo'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 transition-colors rounded-md p-0.5 ${
                            snapshot.isDraggingOver ? 'bg-blue-100/60' : ''
                          }`}
                        >
                          {colLeads.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 text-xs italic">
                              Sin prospectos aquí
                            </div>
                          ) : (
                            colLeads.map((lead, index) => {
                              const sla = evaluarSla48h(
                                lead.sla_limite_atencion,
                                lead.etapa_kanban
                              )
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
                                      className={`bg-white p-3 rounded-md border text-left shadow-sm transition-shadow cursor-grab active:cursor-grabbing hover:shadow-md ${
                                        dragSnapshot.isDragging
                                          ? 'border-mc-azul shadow-lg rotate-1'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                        <h4 className="font-bold text-sm text-mc-negro truncate">
                                          {lead.nombre || 'Prospecto'}
                                        </h4>
                                        <PrioridadBadge prioridad={lead.prioridad_icp} />
                                      </div>

                                      <div className="mb-2 flex flex-wrap items-center gap-1 min-w-0">
                                        <span
                                          title={lead.arquetipo_calculado || 'SATURADO'}
                                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-mc-azul/10 text-mc-azul max-w-full truncate"
                                        >
                                          {(lead.arquetipo_calculado &&
                                            lead.arquetipo_calculado in PERFILES &&
                                            PERFILES[lead.arquetipo_calculado as PerfilKey].tag) ||
                                            lead.arquetipo_calculado ||
                                            'Saturado'}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${sla.claseSemaforo}`}>
                                          {sla.texto}
                                        </span>
                                      </div>

                                      {lead.pregunta_0_texto && (
                                        <p className="text-[11px] text-mc-tinta bg-gray-50 border border-gray-200 rounded px-2 py-1 mb-2 line-clamp-2">
                                          ⚡ {lead.pregunta_0_texto}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2">
                                        <span>
                                          Score 4D: <strong className="text-mc-negro">{scorePromedio}%</strong>
                                        </span>
                                        {lead.notas_seguimiento && (
                                          <span title={lead.notas_seguimiento} className="text-mc-azul font-semibold">
                                            📝 Con nota
                                          </span>
                                        )}
                                      </div>

                                      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-1.5">
                                        {lead.whatsapp ? (
                                          <a
                                            href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="min-h-[36px] inline-flex items-center text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-1.5 rounded hover:bg-emerald-50"
                                          >
                                            WhatsApp ↗
                                          </a>
                                        ) : (
                                          <span className="text-[10px] text-gray-400">Sin WA</span>
                                        )}

                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopyBrief(lead, e)}
                                            className="min-h-[36px] px-2 text-[11px] font-semibold rounded border border-gray-200 text-mc-tinta hover:bg-gray-100 cursor-pointer"
                                          >
                                            {copiedId === lead.lead_id ? '✓ Copiado' : '📋 Brief'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => handleOpenEditLead(lead, e)}
                                            className="min-h-[36px] px-2 text-[11px] font-semibold rounded border border-gray-200 text-mc-azul hover:bg-blue-50 cursor-pointer"
                                          >
                                            ✏️
                                          </button>
                                        </div>
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
      )}

      {/* Bandeja de Descartados */}
      {mostrarDescartados && leadsDescartados.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-mc-tinta uppercase tracking-wider">
            Prospectos Descartados ({leadsDescartados.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leadsDescartados.map((lead) => (
              <div
                key={lead.lead_id}
                className="p-3 rounded border border-gray-200 bg-gray-50 flex flex-col justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-sm text-mc-negro">{lead.nombre || 'Prospecto'}</p>
                  <p className="text-xs text-gray-600">{lead.arquetipo_calculado}</p>
                  {lead.motivo_descarte && (
                    <p className="text-xs text-mc-rojo mt-1">Motivo: {lead.motivo_descarte}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    persistLeadMove({
                      leadId: lead.lead_id,
                      nuevaEtapa: 'COMPLETADO_SIN_CONTACTO',
                      fromEtapa: 'DESCARTADO',
                      leadNombre: lead.nombre,
                      showUndo: true,
                    })
                  }
                  disabled={isUpdating}
                  className="min-h-[44px] w-full text-xs font-bold text-mc-azul border border-mc-azul rounded hover:bg-mc-azul hover:text-white transition-colors cursor-pointer"
                >
                  Restaurar al Kanban
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Edición de Lead (Notas, Descarte, Brief y Etapa) */}
      {editingLead && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
          onClick={() => setEditingLead(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-mc-negro">
                  {editingLead.nombre || 'Gestión Comercial'}
                </h3>
                <p className="text-xs text-mc-gris">
                  {editingLead.arquetipo_calculado} · {editingLead.whatsapp}
                </p>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-mc-negro text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {editingLead.brief_comercial && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mc-azul mb-1">
                    Brief Comercial Sugerido (WhatsApp)
                  </label>
                  <pre className="text-xs bg-blue-50/70 border border-blue-200 rounded p-3 whitespace-pre-wrap font-sans text-mc-tinta">
                    {editingLead.brief_comercial}
                  </pre>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mc-tinta mb-1">
                  Etapa en Pipeline
                </label>
                <select
                  value={editEtapa}
                  onChange={(e) => setEditEtapa(e.target.value as PipelineStage)}
                  className="w-full min-h-[44px] border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  {ETAPAS_PIPELINE.map((et) => (
                    <option key={et} value={et}>
                      {ETAPA_LABEL[et] || et}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mc-tinta mb-1">
                  Notas de seguimiento
                </label>
                <textarea
                  rows={3}
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  placeholder="Ej: Se envió audio por WhatsApp, responde mañana a las 10h..."
                  className="w-full border border-gray-300 rounded p-3 text-sm"
                />
              </div>

              {editEtapa === 'DESCARTADO' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mc-rojo mb-1">
                    Motivo de descarte
                  </label>
                  <input
                    type="text"
                    value={editDescarte}
                    onChange={(e) => setEditDescarte(e.target.value)}
                    placeholder="Ej: No es decisor, solo estudiante / fuera de perfil"
                    className="w-full min-h-[44px] border border-red-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-gray-50">
              <div className="px-6 py-3 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingLead(null)}
                  disabled={savingModal}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded bg-gray-200 text-mc-tinta hover:bg-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveLeadModal}
                  disabled={savingModal}
                  className="min-h-[44px] px-5 py-2 text-sm font-bold rounded bg-mc-azul hover:bg-mc-azul-marino text-white disabled:opacity-50 cursor-pointer"
                >
                  {savingModal ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, #1A3D84 0%, #1A3D84 60%, #E1061E 60%, #E1061E 80%, #F7CC13 80%, #F7CC13 100%)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast (10s) */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-mc-tinta text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700 flex items-center gap-4 animate-fade-up">
          <div className="text-xs">
            <p className="font-bold">
              {undoToast.nombre} → {ETAPA_LABEL[undoToast.toEtapa] || undoToast.toEtapa}
            </p>
            <p className="text-gray-300">Podés deshacer en {undoToast.secondsLeft}s</p>
          </div>
          <button
            onClick={() => {
              const snapshot = undoToast
              setUndoToast(null)
              persistLeadMove({
                leadId: snapshot.leadId,
                nuevaEtapa: snapshot.fromEtapa,
                showUndo: false,
              })
            }}
            className="min-h-[44px] px-3 py-1.5 rounded bg-[#F7CC13] text-[#2B2B2B] font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  )
}
