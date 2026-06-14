/**
 * Verificación e2e — 8 perfiles, flow completo.
 * Clicks por texto exacto, waits por contenido real, no por URL.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE   = 'http://localhost:3001'
const SS_DIR = 'scripts/screenshots/8perfiles'
mkdirSync(SS_DIR, { recursive: true })

const OPCIONES = [
  { 1:'Todo se para', 2:'Se complica bastante', 3:'Hay algunos roces, pero sigue', 4:'Funciona igual que si estoy' },
  { 1:'Esperándolos', 2:'Solo por recomendación', 3:'Sin sistema claro', 4:'De forma enteramente predecible' },
  { 1:'Bajo el precio, "al toque"', 2:'Pierdo la venta', 3:'Lo intento convencer, a veces funciona', 4:'Manejo bien la objeción' },
  { 1:'Cada uno interpreta a su manera', 2:'Con roces silenciosos', 3:'Más o menos', 4:'Sí, hay alineación real' },
  { 1:'Siempre los mismos, hay que explicar y volver a explicar', 2:'Con frecuencia, tranquilo', 3:'A veces, aprendemos lento', 4:'Raramente se repiten' },
  { 1:'La verdad, creo que me venden humo', 2:'Tengo mis dudas', 3:'Cumplen, solo eso, pero me falta más', 4:'Confío 100% en ellos. Estoy seguro' },
  { 1:'Voy viendo sobre la marcha', 2:'Tengo alguna idea vaga', 3:'La tengo clara, pero sin ejecutar ni bajarla', 4:'Tengo un plan concreto, bajado y funcionando' },
  { 1:'Caos total', 2:'Creciendo, pero sin estructura', 3:'Estable, pero quiero más', 4:'Ordenado y avanzando' },
]

function detectarPerfil(r) {
  const total=r.reduce((a,b)=>a+b,0), p=total/8
  if(r[5]<=2&&r[0]>=3&&total>=22) return 'ESCEPTICO'
  if(r[3]===1&&r[0]>=2&&total<=18) return 'EQUIPO_DESALINEADO'
  if(r[2]<=2&&r[1]>=3) return 'VENDEDOR_SIN_RESULTADOS'
  if(r[2]<=2&&r[7]>=3&&total>=18) return 'PROFESIONAL_INVISIBLE'
  if(r[3]<=2&&r[6]>=3&&r[0]>=3) return 'NUEVA_GENERACION'
  if(r[7]===2&&total>=18) return 'ORDEN_PARA_CRECER'
  if(r[0]>=2&&r[4]<=2&&total>=16) return 'LIDER_SOLA'
  if(r[0]>=3&&total>=20) return 'LIDER_SOLA'
  if(r[0]<=2&&total<=20) return 'EMPRENDEDOR_SATURADO'
  if(p<=2) return 'EMPRENDEDOR_SATURADO'
  if(p<=2.5) return 'VENDEDOR_SIN_RESULTADOS'
  if(p<=3) return 'ORDEN_PARA_CRECER'
  return 'LIDER_SOLA'
}

const ESCENARIOS = [
  { perfil:'EMPRENDEDOR_SATURADO',    valores:[1,1,1,1,1,1,1,1] },
  { perfil:'LIDER_SOLA',              valores:[4,4,4,4,4,4,4,4] },
  { perfil:'ESCEPTICO',               valores:[3,3,3,3,3,2,3,3] },
  { perfil:'EQUIPO_DESALINEADO',      valores:[2,2,2,1,2,2,2,2] },
  { perfil:'VENDEDOR_SIN_RESULTADOS', valores:[2,3,2,2,2,2,2,2] },
  { perfil:'PROFESIONAL_INVISIBLE',   valores:[3,2,2,2,2,2,2,3] },
  { perfil:'NUEVA_GENERACION',        valores:[3,2,3,2,2,2,3,2] },
  { perfil:'ORDEN_PARA_CRECER',       valores:[1,3,3,2,3,3,3,2], clickCTA:true },
]

// Pre-validar
console.log('── Pre-validación ───────────────────────────────────────────')
for (const e of ESCENARIOS) {
  const c = detectarPerfil(e.valores)
  const ok = c===e.perfil
  console.log(`  ${ok?'✅':'❌'} ${e.perfil.padEnd(26)} ${JSON.stringify(e.valores)}`)
  if(!ok){ console.log(`     calculado: ${c}`); process.exit(1) }
}
console.log('')

async function ss(page, label) {
  await page.screenshot({ path:`${SS_DIR}/${label}.png`, fullPage:false }).catch(()=>{})
}

async function runEscenario(browser, esc, idx) {
  const log=[], err=[]
  const prefix = `${String(idx+1).padStart(2,'0')}_${esc.perfil}`
  const nombre = `Test${idx+1}`

  const ctx = await browser.newContext({ viewport:{width:390,height:844} })
  const page = await ctx.newPage()

  try {
    // 1 — Home: esperar networkidle para que Next.js hidrate
    await page.goto(BASE, { waitUntil:'networkidle', timeout:20000 })
    await page.waitForSelector('button:has-text("DESCUBRIR")', {timeout:10000})
    log.push('✅ / cargó')

    // 2 — Navegar a /diagnostico: click + esperar input secuencialmente
    await page.click('button:has-text("DESCUBRIR")')
    await page.waitForSelector('input[type="text"]', {timeout:15000})
    log.push('✅ /diagnostico')

    // 3 — Nombre
    await page.fill('input[type="text"]', nombre)
    await page.click('button:has-text("EMPEZAR")')
    await page.waitForSelector('[role="radio"]', {timeout:10000})
    log.push(`✅ nombre "${nombre}"`)
    await ss(page, `${prefix}_q1`)

    // 4 — 8 preguntas, click por texto exacto
    for (let i=0; i<8; i++) {
      const texto = OPCIONES[i][esc.valores[i]]
      await page.waitForSelector('[role="radio"]', {timeout:8000})

      const btn = page.locator(`[role="radio"]:has-text("${texto.replace(/"/g,'\\"')}")`)
      await btn.waitFor({state:'visible', timeout:5000})
      await btn.click()

      const esUltima = i===7
      const btnTxt = esUltima ? 'VER MI DIAGNÓSTICO →' : 'SIGUIENTE →'
      const siguiente = page.locator(`button:has-text("${btnTxt}")`).first()
      await siguiente.waitFor({state:'visible', timeout:5000})
      await page.waitForTimeout(200)
      await siguiente.click({force:true})

      if (!esUltima) await page.waitForTimeout(450)
      log.push(`✅ P${i+1} val=${esc.valores[i]}`)
    }

    // 5 — /datos: esperar H1 con el nombre
    await page.waitForFunction(
      n => document.querySelector('h1')?.textContent?.includes(n),
      nombre, {timeout:15000}
    )
    const h1d = await page.textContent('h1')
    log.push(`✅ /datos H1="${h1d?.trim()}"`)
    await ss(page, `${prefix}_datos`)

    // Verificar storage antes de submit
    const storageAntes = await page.evaluate(()=>{
      try { return JSON.parse(sessionStorage.getItem('mc_diagnostico')||'{}') } catch { return {} }
    })
    if (!storageAntes.perfil || !storageAntes.respuestas) {
      err.push(`storage incompleto antes de submit: ${JSON.stringify(storageAntes)}`)
    }
    if ((storageAntes.respuestas||[]).filter(v=>v===0).length > 0) {
      err.push(`CEROS en respuestas: ${JSON.stringify(storageAntes.respuestas)}`)
    }

    // 6 — Submit formulario
    await page.fill('input[type="tel"]', '1123456789')
    await page.locator('button:has-text("VER MI DIAGNÓSTICO →")').first().click({force:true})

    // Esperar navegación a /resultado (puede tardar ~2s por la API de email)
    await page.waitForURL('**/resultado', {timeout:20000})
    // Esperar que el useEffect cargue el session y renderice el contenido
    await page.waitForSelector('button[class*="bg-mc-azul"]', {timeout:15000})
    await ss(page, `${prefix}_resultado`)

    // Leer storage
    const storage = await page.evaluate(()=>{
      try { return JSON.parse(sessionStorage.getItem('mc_diagnostico')||'{}') } catch { return {} }
    })
    const perfilS   = storage.perfil
    const respS     = storage.respuestas||[]
    const ceros     = respS.filter(v=>v===0).length
    const perfilC   = detectarPerfil(respS)
    const areaCards = await page.locator('[style*="border-left"]').count()
    const verdad    = await page.locator('p[class*="font-bold"]').first().textContent().catch(()=>'')
    const ctaTexto  = await page.locator('button[class*="bg-mc-azul"]').first().textContent().catch(()=>'')

    log.push(`✅ /resultado`)
    log.push(`   perfil:     ${perfilS}`)
    log.push(`   respuestas: ${JSON.stringify(respS)}`)
    log.push(`   verdad:     "${verdad?.trim().substring(0,55)}..."`)
    log.push(`   áreas:      ${areaCards} cards`)
    log.push(`   CTA:        "${ctaTexto?.trim()}"`)

    if (ceros>0) err.push(`${ceros} ceros en respuestas`)
    if (perfilS!==esc.perfil) err.push(`perfil="${perfilS}" esperado="${esc.perfil}"`)
    if (perfilC!==perfilS) err.push(`calculado="${perfilC}" vs storage="${perfilS}"`)
    if (areaCards!==5) err.push(`áreas=${areaCards} (esperado 5)`)

    // 7 — /gracias (solo en el escenario marcado → dispara Telegram)
    if (esc.clickCTA) {
      log.push('→ CTA click → Telegram + /gracias...')
      await page.click('button[class*="bg-mc-azul"]')
      await page.waitForFunction(
        ()=>document.querySelector('h1')?.textContent?.includes('Listo'),
        {timeout:10000}
      )
      await ss(page, `${prefix}_gracias`)
      const h1g  = await page.textContent('h1')
      const p1g  = await page.locator('p').first().textContent().catch(()=>'')
      const p2g  = await page.locator('p').nth(1).textContent().catch(()=>'')
      log.push(`✅ /gracias H1="${h1g?.trim()}"`)
      log.push(`   "${p1g?.trim()}"`)
      log.push(`   "${p2g?.trim()}"`)
      if (!h1g?.includes('Listo')) err.push('/gracias no muestra "Listo"')
      if (!p1g?.includes('Sindy')) err.push('falta "Sindy" en /gracias')
    }

    return {ok:err.length===0, log, err}

  } catch(e) {
    await ss(page, `${prefix}_CRASH`).catch(()=>{})
    const url = page.url().replace('http://localhost:3001','')
    return {ok:false, log, err:[...err, `CRASH en ${url}: ${e.message.split('\n')[0]}`]}
  } finally {
    await ctx.close()
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless:true,
  executablePath:'C:/Users/Pablo/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
})

console.log('═'.repeat(65))
console.log('E2E — 8 PERFILES — ' + new Date().toLocaleTimeString())
console.log('═'.repeat(65))

const resultados=[]

for (let i=0; i<ESCENARIOS.length; i++) {
  const e=ESCENARIOS[i]
  const total=e.valores.reduce((a,b)=>a+b,0)
  console.log(`\n[${i+1}/8] ${e.perfil}  total=${total}${e.clickCTA?' ⚡':''}`)
  const r = await runEscenario(browser, e, i)
  r.log.forEach(l=>console.log('  '+l))
  if(r.err.length) r.err.forEach(x=>console.log('  ❌ '+x))
  resultados.push({perfil:e.perfil, ok:r.ok, err:r.err})
  // Pausa entre escenarios para que el server termine requests pendientes
  if (i<ESCENARIOS.length-1) await new Promise(r=>setTimeout(r,2000))
}

await browser.close()

console.log('\n'+'═'.repeat(65))
console.log('RESUMEN')
console.log('═'.repeat(65))
let pass=0,fail=0
for(const r of resultados){
  const icon=r.ok?'✅':'❌'
  const extra=r.err.length?' → '+r.err.join(' | '):''
  console.log(`  ${icon} ${r.perfil}${extra}`)
  r.ok?pass++:fail++
}
console.log(`\n  ${pass}/8 PASS   ${fail}/8 FAIL`)
if(fail===0) console.log('  ✅ TODOS LOS PERFILES VERIFICADOS')
console.log('═'.repeat(65))
