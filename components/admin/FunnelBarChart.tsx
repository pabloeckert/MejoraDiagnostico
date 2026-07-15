'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { EtapaEmbudo } from '@/lib/admin'

const COLORES = ['#1A3D84', '#020659', '#F7CC13', '#E1061E']

export default function FunnelBarChart({ etapas }: { etapas: EtapaEmbudo[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-mc-negro mb-3">Embudo de conversión</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={etapas} layout="vertical" margin={{ left: 24 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="etapa" width={130} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
            {etapas.map((_, i) => (
              <Cell key={i} fill={COLORES[i % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
