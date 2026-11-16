import { NextRequest, NextResponse } from 'next/server'
import { sesionValida } from '@/lib/admin-auth'
import {
  clearAllTestLabData,
  completeDiagnostico,
  getAdminDashboardData,
  getStorageHealth,
  movePipelineLead,
  recordProgress,
  recordVisit,
} from '@/lib/db/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    if (!sesionValida(req)) {
      return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      fingerprint?: string
    }
    const { action, fingerprint } = body

    if (action === 'simulate_completed_72h') {
      const targetFp = fingerprint || 'fp_test_device'
      const sessionId = `sess_test_72h_${Date.now()}`

      await recordVisit({
        sesionId: sessionId,
        fingerprint: targetFp,
        estado: 'VISITA_INICIADA',
        utmSource: 'test_lab',
        ipHash: 'test_ip',
        userAgent: 'TestLab',
      })

      await completeDiagnostico({
        sessionId,
        visitorId: targetFp,
        nombre: 'Test Empresario 72h',
        whatsapp: '+5493764000111',
        perfil: 'SATURADO',
        scores: { personal: 25, organizacional: 30, comercial: 65, empresarial: 40 },
        pregunta0Id: 'incendios',
        pregunta0Texto: 'Apagar incendios operativos y no tener tiempo para pensar',
        pregunta0Dimension: 'personal',
      })

      return NextResponse.json({
        ok: true,
        message: 'Sesión completada simulada con éxito para el fingerprint proporcionado.',
        sessionId,
        fingerprint: targetFp,
      })
    }

    if (action === 'seed_kanban_leads') {
      const ts = Date.now()
      const sampleLeads = [
        {
          sid: `sess_vencido_${ts}`,
          nombre: 'Martín Gómez (Metalúrgica)',
          wa: '+5491155551234',
          arq: 'SATURADO',
          scores: { personal: 20, organizacional: 25, comercial: 60, empresarial: 35 },
          etapa: 'COMPLETADO_SIN_CONTACTO' as const,
          p0: 'Apagar incendios operativos y no tener tiempo para pensar',
        },
        {
          sid: `sess_urgente_${ts}`,
          nombre: 'Lic. Mariana Ramos (Clínica)',
          wa: '+5491144445678',
          arq: 'LIDER_QUE_NECESITA_APOYO',
          scores: { personal: 30, organizacional: 20, comercial: 50, empresarial: 45 },
          etapa: 'COMPLETADO_SIN_CONTACTO' as const,
          p0: 'Mi equipo no responde solo y todo termina en mi escritorio',
        },
        {
          sid: `sess_normal_${ts}`,
          nombre: 'Carlos Rossi (Distribuidora)',
          wa: '+5493764889900',
          arq: 'AREA_COMERCIAL_SIN_RESULTADOS',
          scores: { personal: 50, organizacional: 60, comercial: 20, empresarial: 40 },
          etapa: 'EN_CONTACTO_WHATSAPP' as const,
          p0: 'Las ventas y los ingresos no reflejan el esfuerzo que metemos',
        },
        {
          sid: `sess_reunion_${ts}`,
          nombre: 'Dra. Laura Paz (Estudio Contable)',
          wa: '+5493764112233',
          arq: 'EQUIPO_DESALINEADO',
          scores: { personal: 60, organizacional: 25, comercial: 55, empresarial: 45 },
          etapa: 'REUNION_AGENDADA' as const,
          p0: 'Mi equipo no responde solo y todo termina en mi escritorio',
        },
        {
          sid: `sess_cerrado_${ts}`,
          nombre: 'Ing. Roberto Silva (Agropecuaria)',
          wa: '+5491166667788',
          arq: 'SIN_PROFESIONALIZAR_LA_EMPRESA',
          scores: { personal: 25, organizacional: 20, comercial: 30, empresarial: 25 },
          etapa: 'CERRADO_GANADO' as const,
          p0: 'El negocio funciona de manera artesanal y depende 100% de mí',
        },
      ]

      for (const item of sampleLeads) {
        const res = await completeDiagnostico({
          sessionId: item.sid,
          visitorId: `fp_sample_${item.sid}`,
          nombre: item.nombre,
          whatsapp: item.wa,
          perfil: item.arq,
          scores: item.scores,
          pregunta0Texto: item.p0,
          utmSource: 'test_lab_seed',
        })
        if (item.etapa !== 'COMPLETADO_SIN_CONTACTO') {
          await movePipelineLead({
            leadId: res.leadId,
            nuevaEtapa: item.etapa,
            notas: 'Lead de prueba sembrado desde /test-lab',
          })
        }
      }

      const liveSid = `sess_live_${ts}`
      await recordVisit({
        sesionId: liveSid,
        fingerprint: 'fp_live_user',
        estado: 'VISITA_INICIADA',
        utmSource: 'instagram_ad',
        refContacto: 'wa_campana_pymes',
        ipHash: 'test_live',
        userAgent: 'TestLabLive',
      })
      await recordProgress({
        sessionId: liveSid,
        visitorId: 'fp_live_user',
        evento: 'pregunta_respondida',
        numero: 5,
        segundos: 12,
        valor: 2,
      })

      return NextResponse.json({
        ok: true,
        message: '5 leads de prueba en distintas etapas y 1 sesión en vivo inyectados.',
      })
    }

    if (action === 'clear_test_data') {
      await clearAllTestLabData()
      return NextResponse.json({
        ok: true,
        message: 'Datos de prueba eliminados de almacenamiento persistente sin afectar registros reales.',
      })
    }

    if (action === 'get_status') {
      const [dashboard, health] = await Promise.all([
        getAdminDashboardData(),
        Promise.resolve(getStorageHealth()),
      ])

      return NextResponse.json({
        ok: true,
        storageMode: health.detail,
        persistent: health.persistent,
        totalSesiones: dashboard.sessions.length + dashboard.liveSessions.length,
        totalPipeline: dashboard.pipeline.length,
      })
    }

    return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 })
  } catch (error: unknown) {
    console.error('[Test Lab API] Error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 }
    )
  }
}
