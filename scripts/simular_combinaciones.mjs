// Simulación exhaustiva — 4^8 = 65.536 combinaciones
// Replica exactamente la lógica de detectar.ts (código corregido)

function detectarPerfil(r) {
  const total = r.reduce((a, b) => a + b, 0)
  const promedio = total / 8

  if (r[5] <= 2 && r[0] >= 3 && total >= 22) return 'ESCEPTICO'
  if (r[3] === 1 && r[0] >= 2 && total <= 18) return 'EQUIPO_DESALINEADO'
  if (r[2] <= 2 && r[1] >= 3) return 'VENDEDOR_SIN_RESULTADOS'
  if (r[2] <= 2 && r[7] >= 3 && total >= 18) return 'PROFESIONAL_INVISIBLE'
  if (r[3] <= 2 && r[6] >= 3 && r[0] >= 3) return 'NUEVA_GENERACION'
  if (r[7] === 2 && total >= 18) return 'ORDEN_PARA_CRECER'
  if (r[0] >= 2 && r[4] <= 2 && total >= 16) return 'LIDER_SOLA'
  if (r[0] >= 3 && total >= 20) return 'LIDER_SOLA'
  if (r[0] <= 2 && total <= 20) return 'EMPRENDEDOR_SATURADO'

  if (promedio <= 2)   return 'EMPRENDEDOR_SATURADO'
  if (promedio <= 2.5) return 'VENDEDOR_SIN_RESULTADOS'
  if (promedio <= 3)   return 'ORDEN_PARA_CRECER'
  return 'LIDER_SOLA'
}

const PERFILES_TODOS = [
  'EMPRENDEDOR_SATURADO','LIDER_SOLA','PROFESIONAL_INVISIBLE',
  'EQUIPO_DESALINEADO','ESCEPTICO','NUEVA_GENERACION',
  'VENDEDOR_SIN_RESULTADOS','ORDEN_PARA_CRECER'
]

const distrib = Object.fromEntries(PERFILES_TODOS.map(p => [p, 0]))
const ejemplos = {}
let total = 0

for (let r0 = 1; r0 <= 4; r0++)
for (let r1 = 1; r1 <= 4; r1++)
for (let r2 = 1; r2 <= 4; r2++)
for (let r3 = 1; r3 <= 4; r3++)
for (let r4 = 1; r4 <= 4; r4++)
for (let r5 = 1; r5 <= 4; r5++)
for (let r6 = 1; r6 <= 4; r6++)
for (let r7 = 1; r7 <= 4; r7++) {
  const r = [r0,r1,r2,r3,r4,r5,r6,r7]
  const p = detectarPerfil(r)
  distrib[p]++
  if (!ejemplos[p]) ejemplos[p] = r
  total++
}

console.log('═'.repeat(60))
console.log('SIMULACIÓN — ' + total.toLocaleString() + ' combinaciones (código corregido)')
console.log('═'.repeat(60))
for (const p of PERFILES_TODOS) {
  const n = distrib[p]
  const pct = ((n / total) * 100).toFixed(1)
  const bar = '█'.repeat(Math.round(n / total * 40))
  console.log(`  ${p.padEnd(26)} ${String(n).padStart(6)}  (${pct.padStart(5)}%)  ${bar}`)
}
const alcanzables = PERFILES_TODOS.filter(p => distrib[p] > 0)
console.log(`\n  Perfiles alcanzables: ${alcanzables.length}/8  ✓`)

console.log('\n── Ejemplo mínimo por perfil ────────────────────────────────')
for (const p of PERFILES_TODOS) {
  const e = ejemplos[p]
  const t = e.reduce((a,b)=>a+b,0)
  console.log(`  ${p.padEnd(26)} ${JSON.stringify(e)}  total=${t}`)
}
console.log('═'.repeat(60))
