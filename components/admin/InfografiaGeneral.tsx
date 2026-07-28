'use client'
import { forwardRef } from 'react'
import StatsCards from './StatsCards'
import FunnelBarChart from './FunnelBarChart'
import ProfilePieChart from './ProfilePieChart'
import type { EtapaEmbudo, DistribucionPerfil } from '@/lib/admin'

interface Tarjeta {
  label: string
  valor: string
}

interface Props {
  tarjetas: Tarjeta[]
  etapas: EtapaEmbudo[]
  perfiles: DistribucionPerfil[]
}

const InfografiaGeneral = forwardRef<HTMLDivElement, Props>(function InfografiaGeneral(
  { tarjetas, etapas, perfiles },
  ref
) {
  return (
    <div ref={ref} className="space-y-4 bg-mc-gris-claro">
      <StatsCards tarjetas={tarjetas} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FunnelBarChart etapas={etapas} />
        <ProfilePieChart datos={perfiles} />
      </div>
    </div>
  )
})

export default InfografiaGeneral
