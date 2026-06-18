import { GaugeGlobal } from 'mejora-diagnostico'

export function Default() {
  return <GaugeGlobal value={72} />
}

export function Bajo() {
  return <GaugeGlobal value={31} size="sm" />
}

export function Alto() {
  return <GaugeGlobal value={91} />
}
