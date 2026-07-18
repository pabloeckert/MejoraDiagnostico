'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  calcularEstado,
  filtrarSesionesPorRango,
  filtrarEventosPorRango,
  contarEtapas,
  distribucionPerfiles,
  tiempoPromedioSesion,
  esCompletada,
} from '@/lib/admin'
import type { SessionRow, EventoRow, RangoFecha, EstadoSesion } from '@/lib/admin'
import { DATOS_DEMO, DATOS_DEMO_EVENTOS } from '@/lib/admin-demo-data'
import StatsCards from './StatsCards'
import FunnelBarChart from './FunnelBarChart'
import ProfilePieChart from './ProfilePieChart'
import SessionsTable from './SessionsTable'
import SessionDetailModal from './SessionDetailModal'
import ExportPanel from './ExportPanel'
import TourGuiado from './TourGuiado'

const POLL_MS = 20000
const RANGOS: { key: RangoFecha; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7dias', label: 'Últimos 7 días' },
  { key: 'todo', label: 'Todo' },
]
const TABS: { key: 'general' | 'detalle' | 'exportacion'; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'detalle', label: 'Detalle' },
  { key: 'exportacion', label: 'Exportación' },
]
const ESTADOS_FILTRO: { key: EstadoSesion | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'completado', label: 'Completado' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'retomado', label: 'Retomado' },
  { key: 'abandonado', label: 'Abandonado' },
]

export default function Dashboard() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [eventos, setEventos] = useState<EventoRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const [rango, setRango] = useState<RangoFecha>('hoy')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoSesion | 'todos'>('todos')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detalleSessionId, setDetalleSessionId] = useState<string | null>(null)
  const [tab, setTab] = useState<'general' | 'detalle' | 'exportacion'>('general')
  const [modoDemo, setModoDemo] = useState(false)
  const [mostrarTour, setMostrarTour] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('mc_admin_tour_visto')) setMostrarTour(true)
  }, [])

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/data')
      if (!res.ok) throw new Error('fetch falló')
      const data = await res.json()
      setSessions(data.sessions || [])
      setEventos(data.eventos || [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(cargarDatos, POLL_MS)
    return () => clearInterval(interval)
  }, [cargarDatos])

  const sessionsActivas = modoDemo ? DATOS_DEMO : sessions
  const eventosActivas = modoDemo ? DATOS_DEMO_EVENTOS : eventos

  const sesionesRango = useMemo(() => filtrarSesionesPorRango(sessionsActivas, rango), [sessionsActivas, rango])
  const eventosRango = useMemo(() => filtrarEventosPorRango(eventosActivas, rango), [eventosActivas, rango])

  const visitas = useMemo(
    () => new Set(eventosRango.filter((e) => e.evento === 'landing').map((e) => e.session_id)).size,
    [eventosRango]
  )
  const iniciaron = useMemo(() => sesionesRango.filter((s) => s.nombre.trim()).length, [sesionesRango])
  const completaron = useMemo(() => sesionesRango.filter(esCompletada).length, [sesionesRango])
  const tasaConversion = visitas > 0 ? `${Math.round((completaron / visitas) * 1000) / 10}%` : '—'
  const tiempoPromedio = useMemo(() => tiempoPromedioSesion(sesionesRango), [sesionesRango])

  const etapas = useMemo(() => contarEtapas(sesionesRango, eventosRango), [sesionesRango, eventosRango])
  const perfiles = useMemo(() => distribucionPerfiles(sesionesRango), [sesionesRango])

  // El grid de abajo siempre muestra todo, con su propio filtro (texto + estado), independiente del rango de fechas de arriba.
  const filasGrid = useMemo(() => {
    const ahora = Date.now()
    const q = busqueda.trim().toLowerCase()
    return [...sessionsActivas]
      .filter((s) => {
        if (q && !s.nombre.toLowerCase().includes(q) && !s.whatsapp.toLowerCase().includes(q)) return false
        if (filtroEstado !== 'todos' && calcularEstado(s, ahora) !== filtroEstado) return false
        return true
      })
      .sort((a, b) => Date.parse(b.fecha_inicio || '') - Date.parse(a.fecha_inicio || ''))
  }, [sessionsActivas, busqueda, filtroEstado])

  const todasSeleccionadas = filasGrid.length > 0 && filasGrid.every((s) => selectedIds.has(s.session_id))

  const toggleSelected = (sessionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (todasSeleccionadas) return new Set()
      const next = new Set(prev)
      filasGrid.forEach((s) => next.add(s.session_id))
      return next
    })
  }

  const filasParaExportar = useMemo(() => {
    if (selectedIds.size > 0) return sessionsActivas.filter((s) => selectedIds.has(s.session_id))
    return filasGrid
  }, [sessionsActivas, selectedIds, filasGrid])

  const eventosDetalle = useMemo(
    () => (detalleSessionId ? eventosActivas.filter((e) => e.session_id === detalleSessionId) : []),
    [eventosActivas, detalleSessionId]
  )

  return (
    <div className="min-h-screen bg-mc-gris-claro">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <img src="/logo-color.png" alt="Mejora Continua" className="h-8 object-contain" />
          <h1 className="text-xl font-bold text-mc-negro">Monitor MejoraDiagnostico</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModoDemo((v) => !v)}
            className="text-xs font-semibold px-3 py-2 rounded bg-mc-gris-claro text-mc-gris"
          >
            {modoDemo ? 'Ver datos reales' : 'Ver datos de ejemplo'}
          </button>
          <button
            onClick={() => setMostrarTour(true)}
            aria-label="Ver recorrido de ayuda"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-mc-gris-claro text-mc-gris font-bold text-sm"
          >
            ?
          </button>
        </div>
      </header>

      {modoDemo && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-800 text-sm font-semibold text-center py-2 px-4">
          🎭 MODO DEMO — datos de ejemplo, no reales
        </div>
      )}

      <main className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-xs font-semibold px-3 py-2 rounded ${
                  tab === t.key ? 'bg-mc-azul text-white' : 'bg-mc-gris-claro text-mc-gris'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'general' && (
            <div className="flex items-center gap-2">
              {RANGOS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRango(r.key)}
                  className={`text-xs font-semibold px-3 py-2 rounded ${
                    rango === r.key ? 'bg-mc-azul text-white' : 'bg-mc-gris-claro text-mc-gris'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && !modoDemo && (
          <p className="text-sm text-mc-rojo bg-red-50 border border-red-200 rounded p-3">
            No se pudieron cargar los datos. Reintentando cada {POLL_MS / 1000}s.
          </p>
        )}
        {cargando && !sessionsActivas.length && !error && (
          <p className="text-sm text-mc-gris">Cargando datos…</p>
        )}

        <div key={tab} className="animate-fade-up space-y-8">
          {tab === 'general' && (
            <section className="space-y-4">
              <StatsCards
                tarjetas={[
                  { label: 'Visitas', valor: String(visitas) },
                  { label: 'Iniciaron', valor: String(iniciaron) },
                  { label: 'Completaron', valor: String(completaron) },
                  { label: 'Tasa de conversión', valor: tasaConversion },
                  { label: 'Tiempo promedio sesión completa', valor: tiempoPromedio },
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FunnelBarChart etapas={etapas} />
                <ProfilePieChart datos={perfiles} />
              </div>
            </section>
          )}

          {tab === 'detalle' && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o WhatsApp…"
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
                />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as EstadoSesion | 'todos')}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {ESTADOS_FILTRO.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-mc-gris">{selectedIds.size} seleccionadas</span>
                )}
              </div>

              <SessionsTable
                sesiones={filasGrid}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onToggleSelectAll={toggleSelectAll}
                todasSeleccionadas={todasSeleccionadas}
                onVerDetalle={setDetalleSessionId}
              />
            </section>
          )}

          {tab === 'exportacion' && (
            <section>
              <ExportPanel filas={filasParaExportar} />
            </section>
          )}
        </div>
      </main>

      {detalleSessionId && (
        <SessionDetailModal
          sessionId={detalleSessionId}
          eventos={eventosDetalle}
          onClose={() => setDetalleSessionId(null)}
        />
      )}

      {mostrarTour && <TourGuiado onCerrar={() => setMostrarTour(false)} />}
    </div>
  )
}
