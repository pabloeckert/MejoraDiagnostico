import { ProgressBar } from 'mejora-diagnostico'

export function Inicio() {
  return <ProgressBar current={1} total={8} />
}

export function ConArea() {
  return <ProgressBar current={4} total={8} areaNombre="Desarrollo Comercial" />
}

export function CercaDelFinal() {
  return <ProgressBar current={7} total={8} areaNombre="Desarrollo Empresarial" />
}
