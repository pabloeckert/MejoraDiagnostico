'use client'

interface Tarjeta {
  label: string
  valor: string
}

export default function StatsCards({ tarjetas }: { tarjetas: Tarjeta[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {tarjetas.map((t) => (
        <div key={t.label} className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-mc-azul leading-tight">{t.valor}</p>
          <p className="text-xs text-mc-gris mt-1">{t.label}</p>
        </div>
      ))}
    </div>
  )
}
