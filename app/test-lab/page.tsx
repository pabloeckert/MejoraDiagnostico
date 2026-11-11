'use client'

import React, { useState, useEffect } from 'react'
import { getDeviceFingerprint } from '@/lib/fingerprint'
import { PERFILES, type PerfilKey } from '@/lib/perfiles'

export default function TestLabPage() {
  const [fingerprint, setFingerprint] = useState<string>('Calculando...')
  const [deviceInfo, setDeviceInfo] = useState<any>({})
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<PerfilKey>('SATURADO')
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [cargando, setCargando] = useState<boolean>(false)

  useEffect(() => {
    getDeviceFingerprint().then((fp) => {
      setFingerprint(fp)
      if (typeof window !== 'undefined') {
        setDeviceInfo({
          screen: `${window.screen.width}x${window.screen.height}`,
          pixelRatio: window.devicePixelRatio,
          language: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          platform: navigator.platform,
        })
      }
    })
    consultarEstadoDb()
  }, [])

  const consultarEstadoDb = async () => {
    try {
      const res = await fetch('/api/test-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' }),
      })
      const data = await res.json()
      if (data.ok) setDbStatus(data)
    } catch {}
  }

  const handleSimular72h = async () => {
    setCargando(true)
    setStatusMsg('Registrando diagnóstico previo para tu dispositivo en SQLite...')
    try {
      const res = await fetch('/api/test-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_completed_72h',
          fingerprint,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg('✅ Tu dispositivo quedó bloqueado por 72h. Podés probar ingresar a la landing ("/") para ver el bloqueo elegante.')
        consultarEstadoDb()
      } else {
        setStatusMsg('❌ Error: ' + data.error)
      }
    } catch (e: any) {
      setStatusMsg('❌ Error: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const handleSeedKanban = async () => {
    setCargando(true)
    setStatusMsg('Inyectando leads de prueba con distintos SLAs en SQLite...')
    try {
      const res = await fetch('/api/test-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_kanban_leads' }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg('✅ 5 Leads inyectados en SQLite (con SLAs Verde, Amarillo y Rojo) + 1 sesión en vivo. Andá a /admin para probar el arrastre.')
        consultarEstadoDb()
      } else {
        setStatusMsg('❌ Error: ' + data.error)
      }
    } catch (e: any) {
      setStatusMsg('❌ Error: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const handleLimpiarDatos = async () => {
    setCargando(true)
    setStatusMsg('Limpiando datos de prueba...')
    try {
      const res = await fetch('/api/test-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_test_data' }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatusMsg('✅ Datos de prueba borrados de SQLite.')
        sessionStorage.clear()
        consultarEstadoDb()
      }
    } catch (e: any) {
      setStatusMsg('❌ Error: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const handleAutoLoginAdmin = async () => {
    try {
      await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'adminmc' }),
      })
      window.open('/admin', '_blank')
    } catch {
      window.open('/admin', '_blank')
    }
  }

  const handleCargarDiagnosticoInstantaneo = () => {
    const mockSession = {
      nombre: 'Líder de Prueba',
      perfil: perfilSeleccionado,
      respuestas: [3, 2, 4, 1, 3, 2, 3, 4],
      scores: {
        personal: perfilSeleccionado === 'SATURADO' ? 25 : 55,
        organizacional: perfilSeleccionado === 'EQUIPO_DESALINEADO' ? 20 : 60,
        comercial: perfilSeleccionado === 'AREA_COMERCIAL_SIN_RESULTADOS' ? 20 : 65,
        empresarial: perfilSeleccionado === 'SIN_PROFESIONALIZAR_LA_EMPRESA' ? 22 : 50,
      },
      datos: {
        nombre: 'Líder de Prueba',
        whatsapp: '93764000111',
        codPais: '+54',
      },
    }
    sessionStorage.setItem('mc_diagnostico', JSON.stringify(mockSession))
    window.location.href = '/resultado'
  }

  const perfilObj = PERFILES[perfilSeleccionado]
  const waTextoSimulado = `Hola Sindy, completé mi Diagnóstico Empresarial en Mejora Continua. Mi arquetipo es ${perfilObj.tag} y mis áreas críticas fueron Comercial y Personal. Quiero tener la sesión de claridad para revisar el plan de acción.`
  const waLinkSimulado = `https://wa.me/5493764358152?text=${encodeURIComponent(waTextoSimulado)}`

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12 font-spartan">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Encabezado */}
        <div className="bg-mc-azul-marino text-white p-6 rounded-xl shadow-md border border-mc-azul flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-mc-azul text-xs font-bold uppercase tracking-widest mb-2">
              <span>🧪</span> SECCIÓN OCULTA DE PRUEBAS
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Laboratorio de Pruebas · MejoraDiagnostico V2</h1>
            <p className="text-sm text-gray-300">
              Validación interactiva de Telemetría Temprana, Breaker Anti-Picardía, Pregunta 0, WhatsApp y Kanban con SLA.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              target="_blank"
              className="px-4 py-2 bg-white text-mc-azul font-bold rounded text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
            >
              Ir a Landing (/) ↗
            </a>
            <button
              onClick={handleAutoLoginAdmin}
              className="px-4 py-2 bg-mc-azul hover:bg-blue-600 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Entrar a /admin ↗
            </button>
          </div>
        </div>

        {/* Notificación de Estado */}
        {statusMsg && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold flex items-center justify-between animate-fade-up">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="text-blue-500 hover:text-blue-800 text-xs">
              ✕ Cerrar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Módulo 1: Huella Digital */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-mc-azul font-bold text-sm uppercase tracking-wider">
              <span>📱</span> 1. Huella Digital de este Dispositivo
            </div>
            <p className="text-xs text-gray-500">
              Hash determinístico generado por Canvas 2D + WebGL + hardware. Persiste entre pestañas normales e incógnito.
            </p>

            <div className="p-3 bg-gray-100 rounded text-xs font-mono break-all border border-gray-300 select-all">
              {fingerprint}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <div>Resolución: <strong>{deviceInfo.screen}</strong></div>
              <div>Pixel Ratio: <strong>{deviceInfo.pixelRatio}x</strong></div>
              <div>Zona Horaria: <strong>{deviceInfo.timeZone}</strong></div>
              <div>Idioma: <strong>{deviceInfo.language}</strong></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  sessionStorage.removeItem('mc_device_fingerprint')
                  localStorage.removeItem('mc_device_fingerprint')
                  getDeviceFingerprint().then(setFingerprint)
                  setStatusMsg('Huella recalculada en cliente.')
                }}
                className="w-full py-2 px-3 border border-gray-300 text-xs font-semibold rounded hover:bg-gray-50"
              >
                Recalcular Huella
              </button>
            </div>
          </div>

          {/* Módulo 2: Breaker Anti-Picardía (72h) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-mc-rojo font-bold text-sm uppercase tracking-wider">
              <span>🛡️</span> 2. Breaker Anti-Picardía (72 Horas)
            </div>
            <p className="text-xs text-gray-500">
              Permite simular que este dispositivo ya completó un diagnóstico, para probar el bloqueo y la excepción forzada.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleSimular72h}
                disabled={cargando}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                🔒 Simular Test Completado (Bloquear este Dispositivo)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/"
                  target="_blank"
                  className="text-center py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded border border-gray-300"
                >
                  Probar Entrada Normal (/) ↗
                </a>
                <a
                  href="/?force=1"
                  target="_blank"
                  className="text-center py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded border border-amber-300"
                >
                  Probar Bypass (?force=1) ↗
                </a>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 border-t pt-2">
              * La entrada normal debe mostrar el banner: <em>«Ya calculamos tu diagnóstico estratégico»</em>. La forzada (`?force=1`) permite reintentar y marca `INTENTO_SECUNDARIO_MUTADO`.
            </p>
          </div>

          {/* Módulo 3: Simulador Rápido de Diagnóstico 4D */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm uppercase tracking-wider">
              <span>⚡</span> 3. Simulador Rápido de Resultado 4D
            </div>
            <p className="text-xs text-gray-500">
              Inyecta en la sesión actual cualquiera de los 8 arquetipos para probar la vista `/resultado` sin responder las 8 preguntas.
            </p>

            <div className="space-y-3">
              <select
                value={perfilSeleccionado}
                onChange={(e) => setPerfilSeleccionado(e.target.value as PerfilKey)}
                className="w-full p-2.5 border border-gray-300 rounded text-xs font-semibold bg-white"
              >
                {Object.keys(PERFILES).map((key) => (
                  <option key={key} value={key}>
                    {PERFILES[key as PerfilKey].tag} ({key})
                  </option>
                ))}
              </select>

              <div className="bg-purple-50 p-3 rounded text-xs text-purple-900 border border-purple-200">
                <p className="font-bold">{perfilObj.ref}</p>
                <p className="mt-1 text-[11px] text-purple-700 italic">&ldquo;{perfilObj.verdad}&rdquo;</p>
              </div>

              <button
                onClick={handleCargarDiagnosticoInstantaneo}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-sm"
              >
                Cargar en Sesión y Ver Pantalla /resultado →
              </button>
            </div>
          </div>

          {/* Módulo 4: Centro de Mando Kanban & SLA 48h */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-mc-azul font-bold text-sm uppercase tracking-wider">
              <span>📋</span> 4. Tablero Kanban con Arrastre & SLAs
            </div>
            <p className="text-xs text-gray-500">
              Inyecta prospectos de muestra con contador regresivo de 48h (verde, amarillo y rojo parpadeante) y 1 sesión en vivo.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleSeedKanban}
                disabled={cargando}
                className="w-full py-2.5 px-4 bg-mc-azul hover:bg-mc-azul-marino text-white font-bold rounded text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                ➕ Inyectar 5 Leads en SQLite con Distintos SLAs
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleAutoLoginAdmin}
                  className="flex-1 text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors shadow-sm"
                >
                  Abrir Tablero Kanban en /admin ↗
                </button>

                <button
                  onClick={handleLimpiarDatos}
                  disabled={cargando}
                  className="py-2 px-3 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded"
                >
                  Limpiar Datos Test
                </button>
              </div>
            </div>

            {dbStatus && (
              <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-200 flex justify-between">
                <span>Sesiones en SQLite: <strong>{dbStatus.totalSesiones}</strong></span>
                <span>En Pipeline Comercial: <strong>{dbStatus.totalPipeline}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Módulo 5: Inspector del Enlace de WhatsApp */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm uppercase tracking-wider">
              <span>💬</span> 5. Mensaje Estructurado a WhatsApp (Sindy · +54 9 376 435-8152)
            </div>
            <a
              href={waLinkSimulado}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline"
            >
              Probar Enlace en WhatsApp ↗
            </a>
          </div>

          <p className="text-xs text-gray-500">
            Este es el mensaje exacto que el botón CTA final de `/resultado` codifica e inyecta en el chat de WhatsApp:
          </p>

          <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 text-xs text-emerald-900 font-mono">
            {waTextoSimulado}
          </div>
        </div>
      </div>
    </div>
  )
}
