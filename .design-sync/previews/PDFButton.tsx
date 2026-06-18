import { PDFButton } from 'mejora-diagnostico'

const AREAS = [
  { nombre: 'Desarrollo Personal', porcentaje: 64 },
  { nombre: 'Desarrollo Organizacional', porcentaje: 38 },
  { nombre: 'Desarrollo Comercial', porcentaje: 71 },
  { nombre: 'Desarrollo Empresarial', porcentaje: 55 },
]

export function Default() {
  return <PDFButton perfil="LIDER_QUE_NECESITA_APOYO" nombre="Juan Pérez" areas={AREAS} />
}
