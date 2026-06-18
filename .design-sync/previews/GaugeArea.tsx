import { GaugeArea } from 'mejora-diagnostico'

export function Critico() {
  return <GaugeArea value={28} delayMs={0} />
}

export function Solido() {
  return <GaugeArea value={82} delayMs={0} />
}

export function Compacta() {
  return (
    <div style={{ width: 160 }}>
      <GaugeArea value={55} delayMs={0} compact />
    </div>
  )
}
