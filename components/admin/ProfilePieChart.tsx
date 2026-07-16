'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DistribucionPerfil } from '@/lib/admin'
import { PALETA_GRAFICOS } from '@/lib/admin-colors'

function colorSlice(i: number): string {
  const color = PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]
  const vuelta = Math.floor(i / PALETA_GRAFICOS.length)
  return vuelta % 2 === 1 ? `${color}CC` : color // CC ≈ 80% opacidad en la segunda vuelta
}

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
                <Cell key={i} fill={colorSlice(i)} />
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
