import { useState } from 'react'
import { QuestionCard } from 'mejora-diagnostico'

const PREGUNTA_1 = {
  texto: 'Si no estás, ¿qué para?',
  contexto: 'Pensá en la última vez que te fuiste de vacaciones.',
  opciones: [
    { texto: 'Todo se para', valor: 1 },
    { texto: 'Se complica bastante', valor: 2 },
    { texto: 'Hay algunos roces, pero sigue', valor: 3 },
    { texto: 'Funciona igual que si estoy', valor: 4 },
  ],
}

const PREGUNTA_8 = {
  texto: 'Si subieras tus precios un 20% mañana, ¿qué pasa?',
  contexto: 'La respuesta real, no la que te gustaría dar.',
  opciones: [
    { texto: 'Pierdo la mitad de mis clientes', valor: 1 },
    { texto: 'Pierdo algunos clientes, me asusta probarlo', valor: 2 },
    { texto: 'Algunos clientes se van, pero se compensa', valor: 3 },
    { texto: 'Ningún cliente se mueve, ya lo hice antes', valor: 4 },
  ],
}

export function SinSeleccion() {
  const [sel, setSel] = useState<number | null>(null)
  return (
    <QuestionCard
      texto={PREGUNTA_1.texto}
      numero={1}
      contexto={PREGUNTA_1.contexto}
      opciones={PREGUNTA_1.opciones}
      seleccionada={sel}
      onSelect={setSel}
    />
  )
}

export function ConSeleccion() {
  const [sel, setSel] = useState<number | null>(3)
  return (
    <QuestionCard
      texto={PREGUNTA_8.texto}
      numero={8}
      contexto={PREGUNTA_8.contexto}
      opciones={PREGUNTA_8.opciones}
      seleccionada={sel}
      onSelect={setSel}
    />
  )
}
