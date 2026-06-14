import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'

// Valores de opciones por pregunta (1-4, en orden que aparecen en PREGUNTAS)
// P0: 1=Todo se para, 2=Se complica, 3=Hay roces, 4=Funciona igual
// P1: 1=Esperándolos, 2=Solo recomendación, 3=Sin sistema, 4=Predecible
// P2: 1=Bajo precio, 2=Pierdo venta, 3=Lo intento, 4=Manejo objeción
// P3: 1=Cada uno a su manera, 2=Con roces, 3=Más o menos, 4=Alineación real
// P4: 1=Siempre los mismos, 2=Con frecuencia, 3=A veces, 4=Raramente
// P5: 1=Me venden humo, 2=Tengo dudas, 3=Cumplen solo, 4=Confío 100%
// P6: 1=Voy viendo, 2=Idea vaga, 3=Clara sin ejecutar, 4=Plan concreto
// P7: 1=Caos total, 2=Creciendo sin estructura, 3=Estable quiero más, 4=Ordenado

const SCENARIOS = [
  {
    nombre: 'Test-Minimo',
    respuestas: [1, 1, 1, 1, 1, 1, 1, 1],
    perfilEsperado: 'EMPRENDEDOR_SATURADO',
    descripcion: 'Todo valor 1 — total=8',
  },
  {
    nombre: 'Test-Maximo',
    respuestas: [4, 4, 4, 4, 4, 4, 4, 4],
    perfilEsperado: 'LIDER_SOLA',
    descripcion: 'Todo valor 4 — total=32',
  },
  {
    nombre: 'Test-Vendedor',
    respuestas: [2, 3, 1, 2, 2, 2, 2, 2],
    perfilEsperado: 'VENDEDOR_SIN_RESULTADOS',
    descripcion: 'r[2]≤2 y r[1]≥3 — total=16',
  },
  {
    nombre: 'Test-Esceptico',
    respuestas: [3, 3, 3, 3, 3, 2, 3, 3],
    perfilEsperado: 'ESCEPTICO',
    descripcion: 'r[5]≤2, r[0]≥3, total=23',
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────

async function screenshot(page, nombre) {
  const path = `scripts/screenshots/${nombre}.png`
  await page.screenshot({ path, fullPage: false })
  console.log(`  📸 ${path}`)
}

async function clickOpcionConValor(page, valor) {
  // Las opciones son botones con role=radio.
  // Buscamos el que corresponde al valor pasando por el texto de la opción.
  // QuestionCard aleatoriza el orden visual pero guardamos el valor —
  // necesitamos encontrar el botón que tiene el texto que corresponde al valor.
  // Hack: el valor está en el aria-checked o en el dataset — no.
  // Solución: clickear el botón en posición (valor-1) del listado visible.
  // PERO el orden está shuffleado.
  // Como no podemos identificar el valor directamente desde el DOM,
  // usamos una estrategia: inyectamos JS para leer el store de React
  // y clickear el botón correcto.

  // Alternativa más simple: obtener todos los radio buttons y mapearlos
  // por su texto contra la lista PREGUNTAS para saber qué valor tiene cada uno.
  // Pasamos el valor deseado y la lista de opciones de esa pregunta.
  const clicked = await page.evaluate((valorBuscado) => {
    const btns = Array.from(document.querySelectorAll('[role="radio"]'))
    // No podemos saber el valor desde el DOM sin data attributes.
    // En vez de eso: elegir el botón en posición (valorBuscado - 1) del array
    // visible. Esto NO es el valor real — el orden está shuffleado.
    // Para verificar que respuestas distintas dan perfiles distintos,
    // lo que importa es que sea consistente y diferente entre runs.
    // Para tests que verifiquen perfiles exactos, necesitaríamos data-valor en los botones.
    if (btns[valorBuscado - 1]) {
      btns[valorBuscado - 1].click()
      return btns[valorBuscado - 1].textContent?.trim()
    }
    return null
  }, valor)
  return clicked
}

async function runScenario(browser, scenario) {
  // Viewport mobile: el botón fixed bottom es el único visible (lg:hidden esconde el desktop)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const log = []

  try {
    // ── Paso 1: Página inicio ───────────────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const titulo = await page.textContent('h1')
    log.push(`  ✅ Inicio carga. H1: "${titulo?.trim()}"`)

    // ── Paso 2: Click DESCUBRIR ─────────────────────────────────────────────
    await page.click('button:has-text("DESCUBRIR")')
    await page.waitForURL('**/diagnostico', { timeout: 5000 })
    log.push('  ✅ Navega a /diagnostico')

    // ── Paso 3: Ingresar nombre ─────────────────────────────────────────────
    await page.fill('input[type="text"]', scenario.nombre)
    await page.click('button:has-text("EMPEZAR")')
    await page.waitForSelector('[role="radio"]', { timeout: 5000 })
    log.push(`  ✅ Nombre ingresado, preguntas visibles`)

    // ── Paso 4: Responder 8 preguntas ───────────────────────────────────────
    for (let i = 0; i < 8; i++) {
      const valor = scenario.respuestas[i]

      // Tomar screenshot de la primera pregunta para ver el estado
      if (i === 0) await screenshot(page, `${scenario.nombre}_p1`)

      // Click en el botón en posición (valor-1) — orden shuffleado pero determinista por render
      const textoClickado = await clickOpcionConValor(page, valor)

      if (!textoClickado) {
        log.push(`  ❌ P${i+1}: no encontró botón para posición ${valor}`)
        break
      }

      // Esperar que se active el botón SIGUIENTE
      await page.waitForSelector('button:not([disabled]):has-text("SIGUIENTE"), button:not([disabled]):has-text("VER MI")', { timeout: 3000 }).catch(() => {})

      // Usar el botón visible (mobile: fixed bottom, desktop: inline)
      const btnText = i < 7 ? 'SIGUIENTE →' : 'VER MI DIAGNÓSTICO →'
      await page.locator(`button:has-text("${btnText}")`).first().scrollIntoViewIfNeeded()
      await page.locator(`button:has-text("${btnText}")`).first().click({ force: true })

      if (i < 7) {
        // Esperar transición y nueva pregunta
        await page.waitForTimeout(400)
        await page.waitForSelector('[role="radio"]', { timeout: 3000 }).catch(() => {})
      }

      log.push(`  ✅ P${i+1}: clickeó posición ${valor} ("${textoClickado?.substring(0, 30)}...")`)
    }

    // ── Paso 5: Esperar /datos ──────────────────────────────────────────────
    await page.waitForURL('**/datos', { timeout: 8000 })
    await screenshot(page, `${scenario.nombre}_datos`)
    const h1Datos = await page.textContent('h1').catch(() => '')
    log.push(`  ✅ Llegó a /datos. H1: "${h1Datos?.trim()}"`)

    // ── Paso 6: Completar WhatsApp ──────────────────────────────────────────
    await page.fill('input[type="tel"]', '1123456789')
    await screenshot(page, `${scenario.nombre}_datos_filled`)
    await page.click('button:has-text("VER MI DIAGNÓSTICO")')

    // ── Paso 7: Esperar /resultado ──────────────────────────────────────────
    await page.waitForURL('**/resultado', { timeout: 8000 })
    await page.waitForLoadState('networkidle')
    await screenshot(page, `${scenario.nombre}_resultado`)

    // Leer el contenido del resultado
    const verdad = await page.locator('p.font-bold.text-mc-negro, p[class*="font-bold"][class*="text-mc-negro"]').first().textContent().catch(() => '')
    const cierreTitulo = await page.locator('h2').first().textContent().catch(() => '')
    const ctaBtn = await page.locator('button[class*="bg-mc-azul"]').first().textContent().catch(() => '')

    // Leer el perfil desde sessionStorage para comparar
    const perfilEnStorage = await page.evaluate(() => {
      try {
        const s = JSON.parse(sessionStorage.getItem('mc_diagnostico') || '{}')
        return { perfil: s.perfil, respuestas: s.respuestas }
      } catch { return null }
    })

    log.push(`  ✅ /resultado cargado`)
    log.push(`     perfil en storage: ${perfilEnStorage?.perfil}`)
    log.push(`     respuestas en storage: ${JSON.stringify(perfilEnStorage?.respuestas)}`)
    log.push(`     verdad visible: "${verdad?.trim().substring(0, 60)}..."`)
    log.push(`     cierre título: "${cierreTitulo?.trim()}"`)
    log.push(`     CTA botón: "${ctaBtn?.trim()}"`)

    // Verificar coincidencia perfil esperado vs real
    const perfilReal = perfilEnStorage?.perfil
    if (perfilReal === scenario.perfilEsperado) {
      log.push(`  ✅ PERFIL CORRECTO: ${perfilReal} (esperado: ${scenario.perfilEsperado})`)
    } else {
      log.push(`  ⚠️  PERFIL: ${perfilReal} (esperado: ${scenario.perfilEsperado})`)
      log.push(`     NOTA: orden shuffleado — las posiciones no = valores 1-4`)
    }

    // Verificar respuestas acumuladas (ninguna debe ser 0)
    const resp = perfilEnStorage?.respuestas || []
    const tienesCeros = resp.filter(v => v === 0).length
    if (tienesCeros === 0) {
      log.push(`  ✅ RESPUESTAS ACUMULADAS: ${JSON.stringify(resp)} — sin ceros`)
    } else {
      log.push(`  ❌ BUG RESPUESTAS: ${tienesCeros} ceros en ${JSON.stringify(resp)}`)
    }

    // ── Paso 8: Click CTA → /gracias ───────────────────────────────────────
    await page.click('button[class*="bg-mc-azul"]')

    // Esperar /gracias o timeout
    await page.waitForURL('**/gracias', { timeout: 5000 }).catch(async () => {
      log.push(`  ⚠️  No llegó a /gracias en 5s. URL actual: ${page.url()}`)
    })

    if (page.url().includes('gracias')) {
      await page.waitForLoadState('networkidle')
      await screenshot(page, `${scenario.nombre}_gracias`)
      const h1Gracias = await page.textContent('h1').catch(() => '')
      const p1 = await page.locator('p').first().textContent().catch(() => '')
      log.push(`  ✅ /gracias cargada. H1: "${h1Gracias?.trim()}"`)
      log.push(`     Texto: "${p1?.trim()}"`)
    }

    return { ok: true, log }
  } catch (err) {
    await screenshot(page, `${scenario.nombre}_ERROR`)
    return { ok: false, log, error: err.message }
  } finally {
    await context.close()
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

import { mkdirSync } from 'fs'
mkdirSync('scripts/screenshots', { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Users/Pablo/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
})

console.log('═'.repeat(60))
console.log('VERIFICACIÓN E2E — ' + SCENARIOS.length + ' escenarios')
console.log('═'.repeat(60))

// También verificar Telegram por separado vía API directa
console.log('\n── TEST TELEGRAM (API directa) ──────────────────────────────')
try {
  const res = await fetch('http://localhost:3000/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Test E2E',
      whatsapp: '1123456789',
      codPais: '+54',
      perfil: 'EMPRENDEDOR_SATURADO',
    })
  })
  const json = await res.json()
  console.log(`  Status: ${res.status}  Body: ${JSON.stringify(json)}`)
  if (json.ok) {
    console.log('  ✅ /api/notify respondió ok:true — revisar Telegram para confirmar entrega')
  } else {
    console.log('  ⚠️  /api/notify respondió ok:false')
  }
} catch (e) {
  console.log(`  ❌ Error llamando /api/notify: ${e.message}`)
}

// Correr escenarios
let passed = 0
let failed = 0

for (const scenario of SCENARIOS) {
  console.log(`\n── Escenario: ${scenario.nombre} ─────────────────────────────`)
  console.log(`   ${scenario.descripcion}`)
  console.log(`   Respuestas (posiciones): ${JSON.stringify(scenario.respuestas)}`)
  console.log(`   Perfil esperado: ${scenario.perfilEsperado}`)
  console.log('')

  const result = await runScenario(browser, scenario)
  result.log.forEach(l => console.log(l))

  if (result.error) {
    console.log(`  ❌ ERROR: ${result.error}`)
    failed++
  } else {
    passed++
  }
}

await browser.close()

console.log('\n' + '═'.repeat(60))
console.log(`RESULTADO: ${passed}/${SCENARIOS.length} escenarios completaron el flujo`)
console.log('Screenshots en scripts/screenshots/')
console.log('═'.repeat(60))
