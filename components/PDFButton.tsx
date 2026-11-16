'use client'
import { useState } from 'react'
import { PERFILES, type PerfilKey } from '@/lib/perfiles'
import { zonaColor } from '@/lib/areas'
import type { PlanAccion72h } from '@/lib/plan-accion'

interface Props {
  perfil: PerfilKey
  nombre: string
  areas: { nombre: string; porcentaje: number }[]
  plan72h?: PlanAccion72h
}

export default function PDFButton({ perfil, nombre, areas, plan72h }: Props) {
  const [loading, setLoading] = useState(false)
  const p = PERFILES[perfil]

  async function handleDownload() {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210

      // Header
      doc.setFillColor(26, 61, 132)
      doc.rect(0, 0, W, 22, 'F')
      // Firma tricolor institucional
      doc.setFillColor(26, 61, 132)
      doc.rect(0, 22, W * 0.6, 2, 'F')
      doc.setFillColor(225, 6, 30)
      doc.rect(W * 0.6, 22, W * 0.2, 2, 'F')
      doc.setFillColor(247, 204, 19)
      doc.rect(W * 0.8, 22, W * 0.2, 2, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('MEJORA CONTINUA', 14, 14)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('diagnostico.mejoraok.com', W - 14, 14, { align: 'right' })

      // Perfil
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(19)
      doc.setFont('helvetica', 'bold')
      doc.text(p.tag.toUpperCase(), 14, 38)

      doc.setTextColor(26, 61, 132)
      doc.setFontSize(10.5)
      doc.text(p.ref, 14, 46)

      doc.setDrawColor(220, 220, 220)
      doc.line(14, 51, W - 14, 51)

      // Descripción
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(p.desc, W - 28)
      doc.text(descLines, 14, 58)

      // Verdad central
      let y = 58 + descLines.length * 4.5 + 5
      doc.setFillColor(245, 247, 251)
      doc.rect(14, y, W - 28, 17, 'F')
      doc.setFillColor(26, 61, 132)
      doc.rect(14, y, 3, 17, 'F')
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.text('LA VERDAD CENTRAL', 21, y + 5.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(65, 65, 65)
      const vLines = doc.splitTextToSize(p.verdad, W - 38)
      doc.text(vLines, 21, y + 11)

      // Áreas
      y += 24
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DIAGNÓSTICO POR ÁREA', 14, y)
      y += 6

      for (const area of areas) {
        const { color } = zonaColor(area.porcentaje)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(13, 13, 13)
        doc.text(area.nombre, 14, y)
        const pctTxt = `${area.porcentaje}%`
        const rgb = hexToRgb(color)
        doc.setTextColor(rgb.r, rgb.g, rgb.b)
        doc.text(pctTxt, W - 14, y, { align: 'right' })

        doc.setFillColor(230, 230, 230)
        doc.rect(14, y + 2, W - 28, 2.5, 'F')
        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.rect(14, y + 2, ((W - 28) * area.porcentaje) / 100, 2.5, 'F')
        y += 10
      }

      // Plan de Primeras 72 Horas
      if (plan72h) {
        y += 2
        doc.setTextColor(26, 61, 132)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('PLAN DE PRIMERAS 72 HORAS', 14, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(60, 60, 60)
        const origLines = doc.splitTextToSize(plan72h.lecturaOrigen, W - 28)
        doc.text(origLines, 14, y)
        y += origLines.length * 4 + 3

        for (const paso of plan72h.pasos) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(13, 13, 13)
          doc.setFontSize(8.5)
          doc.text(`${paso.dia} · ${paso.titulo}`, 14, y)
          y += 4
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          const aLines = doc.splitTextToSize(paso.accion, W - 28)
          doc.text(aLines, 14, y)
          y += aLines.length * 3.8 + 3
        }
      }

      // Cierre
      if (y < 252) {
        y += 3
        doc.setTextColor(13, 13, 13)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(p.cierreTitulo, 14, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(80, 80, 80)
        const cLines = doc.splitTextToSize(p.cierreTxt, W - 28)
        doc.text(cLines, 14, y)
        y += cLines.length * 4.2 + 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(13, 13, 13)
        doc.text(`Preparado para: ${nombre}`, 14, y)
      }

      // Footer
      doc.setFillColor(26, 61, 132)
      doc.rect(0, 277, W, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        'Mejora Continua · diagnostico.mejoraok.com · IG: mejoraok · WhatsApp: +54 9 376 435-8152',
        W / 2,
        288,
        { align: 'center' }
      )

      doc.save(`Diagnostico_MejoraContinua_${(nombre || 'Empresa').replace(/\s+/g, '_')}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="min-h-[44px] inline-flex items-center gap-2 text-sm font-bold text-mc-azul hover:text-mc-azul-marino underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Generando PDF...' : '📄 Descargar reporte en PDF'}
    </button>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}
