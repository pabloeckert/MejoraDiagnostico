import { calcularScores, detectarPerfil } from '../lib/scoring'

const PERFILES_ESPERADOS = [
  'SATURADO',
  'LIDER_QUE_NECESITA_APOYO',
  'INDEPENDIENTE_EN_CRECIMIENTO',
  'EQUIPO_DESALINEADO',
  'ESCEPTICO',
  'NUEVA_GENERACION',
  'AREA_COMERCIAL_SIN_RESULTADOS',
  'SIN_PROFESIONALIZAR_LA_EMPRESA',
]

const conteo: Record<string, number> = {}
const ejemplos: Record<string, number[]> = {}
PERFILES_ESPERADOS.forEach(p => { conteo[p] = 0 })

let total = 0

for (let r0 = 1; r0 <= 4; r0++)
for (let r1 = 1; r1 <= 4; r1++)
for (let r2 = 1; r2 <= 4; r2++)
for (let r3 = 1; r3 <= 4; r3++)
for (let r4 = 1; r4 <= 4; r4++)
for (let r5 = 1; r5 <= 4; r5++)
for (let r6 = 1; r6 <= 4; r6++)
for (let r7 = 1; r7 <= 4; r7++) {
  const r = [r0, r1, r2, r3, r4, r5, r6, r7]
  const scores = calcularScores(r)
  const perfil = detectarPerfil(scores)
  conteo[perfil] = (conteo[perfil] || 0) + 1
  if (!ejemplos[perfil]) ejemplos[perfil] = r
  total++
}

console.log('\n=== VALIDACIÓN EXHAUSTIVA — 65.536 combinaciones ===\n')
console.log('Total combinaciones:', total)
console.log('\nDistribución por perfil:\n')

PERFILES_ESPERADOS.forEach(p => {
  const n = conteo[p] || 0
  const pct = ((n / total) * 100).toFixed(1)
  const bar = '█'.repeat(Math.round(n / total * 40))
  console.log(`${p.padEnd(36)} ${String(n).padStart(6)} (${pct.padStart(5)}%)  ${bar}`)
  console.log(`  Ejemplo: [${ejemplos[p]?.join(',')}]`)
})

const perfilesSinCasos = PERFILES_ESPERADOS.filter(p => !conteo[p])
if (perfilesSinCasos.length > 0) {
  console.log('\n⚠️  PERFILES INALCANZABLES:', perfilesSinCasos.join(', '))
} else {
  console.log('\n✅ Todos los perfiles son alcanzables')
}

console.log('\nDistribución saludable: ningún perfil debería superar el 25%')
console.log('ni estar por debajo del 3%\n')
