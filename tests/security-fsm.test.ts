import { afterEach, describe, expect, it } from 'vitest'
import {
  ETAPAS_PIPELINE,
  esEtapaValida,
  esTransicionValida,
  evaluarSla48h,
} from '@/lib/pipeline-fsm'
import { crearTokenSesion, passwordCorrecta, tokenValido } from '@/lib/admin-auth'
import { isTestEntityId } from '@/lib/db/sheets-store'

describe('Máquina de Estados Kanban y SLA 48h', () => {
  it('admite las 6 etapas completas y rechaza valores inválidos', () => {
    expect(ETAPAS_PIPELINE).toHaveLength(6)
    expect(esEtapaValida('PROPUESTA_ENVIADA')).toBe(true)
    expect(esEtapaValida('DESCARTADO')).toBe(true)
    expect(esEtapaValida('ETAPA_INEXISTENTE')).toBe(false)
    expect(esTransicionValida('COMPLETADO_SIN_CONTACTO', 'EN_CONTACTO_WHATSAPP')).toBe(true)
    expect(esTransicionValida('CERRADO_GANADO', 'CERRADO_GANADO')).toBe(false)
  })

  it('calcula niveles de SLA 48h con contraste WCAG AA en amarillo (#2B2B2B sobre #F7CC13)', () => {
    const ahora = new Date('2026-11-16T12:00:00Z').getTime()

    const verde = evaluarSla48h('2026-11-18T00:00:00Z', 'COMPLETADO_SIN_CONTACTO', ahora)
    expect(verde.nivel).toBe('verde')
    expect(verde.vencido).toBe(false)

    const amarillo = evaluarSla48h('2026-11-17T04:00:00Z', 'COMPLETADO_SIN_CONTACTO', ahora)
    expect(amarillo.nivel).toBe('amarillo')
    expect(amarillo.claseSemaforo).toContain('#F7CC13')
    expect(amarillo.claseSemaforo).toContain('#2B2B2B')

    const critico = evaluarSla48h('2026-11-16T15:00:00Z', 'COMPLETADO_SIN_CONTACTO', ahora)
    expect(critico.nivel).toBe('rojo')
    expect(critico.vencido).toBe(false)

    const vencido = evaluarSla48h('2026-11-16T10:00:00Z', 'COMPLETADO_SIN_CONTACTO', ahora)
    expect(vencido.nivel).toBe('rojo')
    expect(vencido.vencido).toBe(true)
    expect(vencido.texto).toContain('SLA VENCIDO')

    const cerrado = evaluarSla48h('2026-11-10T10:00:00Z', 'CERRADO_GANADO', ahora)
    expect(cerrado.nivel).toBe('cerrado')
    expect(cerrado.vencido).toBe(false)
  })
})

describe('Seguridad Admin Auth y Limpieza Segura de Test Lab', () => {
  const origPass = process.env.ADMIN_PASSWORD

  afterEach(() => {
    if (origPass === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = origPass
  })

  it('valida estrictamente contra ADMIN_PASSWORD cuando está definida (sin backdoor adminmc)', () => {
    process.env.ADMIN_PASSWORD = 'ClaveSuperSegura2026!'
    expect(passwordCorrecta('ClaveSuperSegura2026!')).toBe(true)
    expect(passwordCorrecta('adminmc')).toBe(false)
    expect(passwordCorrecta('AdminMC')).toBe(false)
  })

  it('permite fallback adminmc/AdminMC únicamente si ADMIN_PASSWORD no existe en entorno', () => {
    delete process.env.ADMIN_PASSWORD
    expect(passwordCorrecta('adminmc')).toBe(true)
    expect(passwordCorrecta('AdminMC')).toBe(true)
    expect(passwordCorrecta('otra')).toBe(false)
  })

  it('firma y verifica tokens de sesión HMAC-SHA256', () => {
    const { token, maxAgeSegundos } = crearTokenSesion()
    expect(maxAgeSegundos).toBeGreaterThan(0)
    expect(tokenValido(token)).toBe(true)
    expect(tokenValido(`${token}tampered`)).toBe(false)
    expect(tokenValido(undefined)).toBe(false)
  })

  it('protege leads reales frente al limpiador de test-lab', () => {
    expect(isTestEntityId('lead_test_123')).toBe(true)
    expect(isTestEntityId('sess_live_999')).toBe(true)
    expect(isTestEntityId('lead_550e8400-e29b')).toBe(false)
    expect(isTestEntityId('550e8400-e29b-41d4')).toBe(false)
  })
})
