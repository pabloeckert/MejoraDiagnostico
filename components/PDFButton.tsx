'use client'
import { useState } from 'react'
import { PERFILES } from '@/lib/perfiles'
import { zonaColor } from '@/lib/areas'
import type { PerfilKey } from '@/lib/perfiles'

interface Props {
  perfil: PerfilKey
  nombre: string
  areas: { nombre: string; porcentaje: number }[]
}

export default function PDFButton({ perfil, nombre, areas }: Props) {
  const [loading, setLoading] = useState(false)
  const p = PERFILES[perfil]

  async function handleDownload() {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const gris = '#656565'

      // Header
      doc.setFillColor(28, 77, 140)
      doc.rect(0, 0, W, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('MEJORA CONTINUA', 14, 14)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('diagnostico.mejoraok.com', W - 14, 14, { align: 'right' })

      // Perfil
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(p.tag.toUpperCase(), 14, 38)

      doc.setTextColor(28, 77, 140)
      doc.setFontSize(11)
      doc.text(p.ref, 14, 47)

      // Línea
      doc.setDrawColor(220, 220, 220)
      doc.line(14, 53, W - 14, 53)

      // Descripción
      doc.setTextColor(101, 101, 101)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(p.desc, W - 28)
      doc.text(descLines, 14, 62)

      // Verdad central
      let y = 62 + descLines.length * 5 + 6
      doc.setFillColor(245, 247, 251)
      doc.rect(14, y, W - 28, 18, 'F')
      doc.setFillColor(28, 77, 140)
      doc.rect(14, y, 3, 18, 'F')
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('LA VERDAD CENTRAL', 21, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(101, 101, 101)
      const vLines = doc.splitTextToSize(p.verdad, W - 38)
      doc.text(vLines, 21, y + 12)

      // Áreas
      y += 26
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('DIAGNÓSTICO POR ÁREA', 14, y)
      y += 7

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
        doc.rect(14, y + 2, W - 28, 3, 'F')
        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.rect(14, y + 2, ((W - 28) * area.porcentaje) / 100, 3, 'F')
        y += 12
      }

      // Cierre
      y += 4
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(p.cierreTitulo, 14, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(101, 101, 101)
      const cLines = doc.splitTextToSize(p.cierreTxt, W - 28)
      doc.text(cLines, 14, y)
      y += cLines.length * 5 + 8

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(13, 13, 13)
      doc.setFontSize(10)
      doc.text(nombre, 14, y)

      // Footer
      doc.setFillColor(28, 77, 140)
      doc.rect(0, 277, W, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        'Mejora Continua · diagnostico.mejoraok.com · IG: mejoraok · WhatsApp: +54 9 376 435-8152',
        W / 2, 288, { align: 'center' }
      )

      doc.save(`Diagnostico_MejoraContinua_${nombre.replace(/\s+/g, '_')}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        fontSize: '14px',
        fontWeight: 700,
        color: '#1C4D8C',
        textDecoration: 'underline',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: 'inherit',
        opacity: loading ? 0.5 : 1,
        transition: 'color 200ms',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.color = '#020659' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#1C4D8C' }}
    >
      {loading ? 'Generando...' : 'Descargar PDF'}
    </button>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}
