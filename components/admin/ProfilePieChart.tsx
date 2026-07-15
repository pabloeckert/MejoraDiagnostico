'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DistribucionPerfil } from '@/lib/admin'

const COLORES = [
  '#1A3D84', '#E1061E', '#F7CC13', '#020659',
  '#656565', '#2B2B2B', '#6B7280', '#8CA3D8',
]

export default function ProfilePieChart({ datos }: { datos: DistribucionPerfil[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-mc-negro mb-3">Distribución de perfiles (completadas)</h3>
      {datos.length === 0 ? (
        <p className="text-sm text-mc-gris py-10 text-center">Sin sesiones completadas en el rango.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={datos} dataKey="cantidad" nameKey="perfil" outerRadius={80} label>
              {datos.map((_, i) => (
                <Cell key={i} fill={COLORES[i % COLORES.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
