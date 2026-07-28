// Generación de PDF individual por sesión e infografía general descargable
// para el dashboard admin. Renderiza componentes React off-screen y los
// captura con html2canvas para producir un PDF/PNG de una sola pantalla.
import type { SessionRow } from './admin'
import { calcularScores, type Scores } from './scoring'
import type { PerfilKey } from './perfiles'

const CLAVES_PREGUNTAS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'] as const

export function parsearRespuestas(session: SessionRow): number[] {
  return CLAVES_PREGUNTAS.map((clave) => {
    const raw = (session[clave] || '').toString()
    const primerToken = raw.split(' — ')[0].trim()
    const valor = parseInt(primerToken, 10)
    return isNaN(valor) ? 0 : valor
  })
}

export function calcularScoresDeSesion(session: SessionRow): Scores | null {
  if (CLAVES_PREGUNTAS.some((clave) => !session[clave]?.trim())) return null
  const respuestas = parsearRespuestas(session)
  if (respuestas.some((v) => v < 1 || v > 4)) return null
  return calcularScores(respuestas)
}

export async function generarPDFSesion(session: SessionRow, perfil: PerfilKey): Promise<void> {
  const scores = calcularScoresDeSesion(session)
  if (!scores) throw new Error('La sesión no tiene respuestas completas — no se puede generar el PDF.')

  const [{ createRoot }, React, { default: html2canvas }, { default: jsPDF }, { default: PDFTemplateResultado }] =
    await Promise.all([
      import('react-dom/client'),
      import('react'),
      import('html2canvas'),
      import('jspdf'),
      import('@/components/admin/PDFTemplateResultado'),
    ])

  const contenedor = document.createElement('div')
  contenedor.style.position = 'fixed'
  contenedor.style.left = '-9999px'
  contenedor.style.top = '0'
  document.body.appendChild(contenedor)

  const root = createRoot(contenedor)
  root.render(React.createElement(PDFTemplateResultado, { session, perfil, scores }))

  // Esperar el render y las imágenes (logo) antes de capturar.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const imagenes = Array.from(contenedor.querySelectorAll('img'))
  await Promise.all(
    imagenes.map((img) =>
      img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res })
    )
  )

  try {
    const target = contenedor.firstElementChild as HTMLElement
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

    const nombreLimpio = (session.nombre || 'sesion').trim().replace(/\s+/g, '-').toLowerCase() || 'sesion'
    const fecha = new Date().toISOString().slice(0, 10)
    pdf.save(`diagnostico-${nombreLimpio}-${fecha}.pdf`)
  } finally {
    root.unmount()
    document.body.removeChild(contenedor)
  }
}

export async function generarInfografiaGeneral(el: HTMLElement): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#F2F2F2', useCORS: true })
  const dataUrl = canvas.toDataURL('image/png')

  const fecha = new Date().toISOString().slice(0, 10)
  const enlace = document.createElement('a')
  enlace.href = dataUrl
  enlace.download = `monitor-resumen-${fecha}.png`
  enlace.click()
}
