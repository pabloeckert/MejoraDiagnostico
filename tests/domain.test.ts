import { describe, expect, it } from 'vitest'
import { calcularScores, detectarPerfil, requierePosicion } from '@/lib/scoring'
import { generarPlanAccion72h } from '@/lib/plan-accion'
import { construirBriefComercial, evaluarSenalesIcp } from '@/lib/signal-scoring'

describe('Motor de Scoring 4D y Perfiles', () => {
  it('detecta ESCEPTICO cuando puntajes son altos y parejos', () => {
    const scores = { personal: 82, organizacional: 80, comercial: 78, empresarial: 85 }
    expect(requierePosicion(scores)).toBe(false)
    expect(detectarPerfil(scores)).toBe('ESCEPTICO')
  })

  it('detecta SIN_PROFESIONALIZAR_LA_EMPRESA cuando puntajes son bajos y parejos', () => {
    const scores = { personal: 32, organizacional: 35, comercial: 30, empresarial: 34 }
    expect(requierePosicion(scores)).toBe(false)
    expect(detectarPerfil(scores)).toBe('SIN_PROFESIONALIZAR_LA_EMPRESA')
  })

  it('requiere pregunta de posición en pares ambiguos y desempata correctamente', () => {
    const scores = { personal: 25, organizacional: 35, comercial: 75, empresarial: 70 }
    expect(requierePosicion(scores)).toBe(true)
    expect(detectarPerfil(scores, 'fundador')).toBe('LIDER_QUE_NECESITA_APOYO')
    expect(detectarPerfil(scores, 'heredero')).toBe('NUEVA_GENERACION')
    expect(detectarPerfil(scores, 'gerente')).toBe('NUEVA_GENERACION')
  })

  it('calcula scores normalizados 0..100 para 8 respuestas nominales', () => {
    const min = calcularScores([1, 1, 1, 1, 1, 1, 1, 1])
    const max = calcularScores([4, 4, 4, 4, 4, 4, 4, 4])
    expect(min).toEqual({ personal: 25, organizacional: 25, comercial: 25, empresarial: 25 })
    expect(max).toEqual({ personal: 100, organizacional: 100, comercial: 100, empresarial: 100 })
  })
})

describe('Plan Accionable 72h & Signal Scoring', () => {
  it('integra el dolor de Pregunta 0 y rol sin lenguaje culpabilizador', () => {
    const plan = generarPlanAccion72h({
      perfil: 'SATURADO',
      scores: { personal: 25, organizacional: 55, comercial: 65, empresarial: 20 },
      pregunta0Texto: 'Apagar incendios operativos y no tener tiempo para pensar',
      posicion: 'fundador',
    })

    expect(plan.lecturaOrigen).toContain('Apagar incendios operativos')
    expect(plan.enfoqueRol).toContain('Como fundador')
    expect(plan.pasos).toHaveLength(3)
    expect(plan.pasos[0].accion.length).toBeGreaterThan(30)
  })

  it('clasifica prioridad ALTA cuando existe brecha crítica e identifica mayor vacilación', () => {
    const scores = { personal: 25, organizacional: 55, comercial: 60, empresarial: 40 }
    const tiempos = [4, 7, 3, 28, 6, 5, 8, 4]
    const evalIcp = evaluarSenalesIcp(scores, tiempos)

    expect(evalIcp.prioridad).toBe('ALTA')
    expect(evalIcp.preguntaMayorDudaIdx).toBe(3)
    expect(evalIcp.preguntaMayorDudaSeg).toBe(28)

    const brief = construirBriefComercial({
      nombre: 'Martín Gómez',
      perfilKey: 'SATURADO',
      scores,
      pregunta0Texto: 'Apagar incendios',
      tiempos,
      utmSource: 'instagram_ad',
    })
    expect(brief).toContain('PRIORIDAD: ALTA')
    expect(brief).toContain('P4 (28s)')
    expect(brief).toContain('Hola Martín,')
  })
})
