import { AreaBar } from 'mejora-diagnostico'

export function Critico() {
  return <AreaBar nombre="Desarrollo Comercial" porcentaje={28} delay={0} />
}

export function EnDesarrollo() {
  return <AreaBar nombre="Desarrollo Organizacional" porcentaje={52} delay={0} />
}

export function Solido() {
  return <AreaBar nombre="Desarrollo Empresarial" porcentaje={82} delay={0} />
}
