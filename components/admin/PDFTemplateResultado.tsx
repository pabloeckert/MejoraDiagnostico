'use client'
import { PERFILES } from '@/lib/perfiles'
import type { PerfilKey } from '@/lib/perfiles'
import type { SessionRow } from '@/lib/admin'
import type { Scores } from '@/lib/scoring'
import { areasParaMostrar, zonaColor } from '@/lib/areas'

interface Props {
  session: SessionRow
  perfil: PerfilKey
  scores: Scores
}

export default function PDFTemplateResultado({ session, perfil, scores }: Props) {
  const p = PERFILES[perfil]
  const areas = areasParaMostrar(scores)

  const globalPct = Math.round(
    (scores.personal + scores.organizacional + scores.comercial + scores.empresarial) / 4
  )
  const globalPctMostrado = Math.min(98, globalPct)
  const { color: globalColor, zona: globalZona } = zonaColor(globalPct)

  const fechaGeneracion = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="w-[800px] bg-white" style={{ fontFamily: "'League Spartan', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="Mejora Continua" className="h-9 object-contain" />
        <span className="text-xs font-bold uppercase tracking-widest text-mc-gris">
          Diagnóstico Empresarial
        </span>
      </div>

      {/* Franja navy — tag + verdad del perfil */}
      <div className="bg-mc-azul-marino px-10 py-10">
        <p className="text-sm font-bold uppercase tracking-widest text-mc-amarillo mb-3">
          {p.tag}
        </p>
        <p className="text-3xl font-bold text-white leading-tight max-w-2xl">
          {p.verdad}
        </p>
      </div>

      {/* Contenido */}
      <div className="px-10 py-10">
        <p className="text-lg font-bold text-mc-negro mb-6">{session.nombre}</p>

        <div className="flex items-baseline gap-3 mb-7 pb-7 border-b border-gray-100">
          <span className="text-5xl font-bold" style={{ color: globalColor }}>
            {globalPctMostrado}%
          </span>
          <span className="text-xs text-mc-gris uppercase tracking-widest">
            puntaje global · {globalZona}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {areas.map((area) => {
            const { color, zona } = zonaColor(area.porcentaje)
            const pct = Math.min(98, Math.round(area.porcentaje))
            return (
              <div key={area.nombre} className="rounded-xl p-4" style={{ backgroundColor: color + '14' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-mc-negro">{area.nombre}</span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: color, color: zona === 'En desarrollo' ? '#2B2B2B' : 'white' }}
                  >
                    {zona}
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: '7px', backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cierre */}
      <div className="bg-mc-azul/5 px-10 py-10 text-center">
        <p className="text-base text-mc-negro leading-relaxed max-w-xl mx-auto">
          {p.cierreTxt}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-10 py-5 text-xs text-mc-gris">
        <span>Generado el {fechaGeneracion}</span>
        <span>mejoraok.com</span>
      </div>
    </div>
  )
}
