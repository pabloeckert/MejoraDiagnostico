export type Area = "personal" | "organizacional" | "comercial" | "empresarial"
export type Opcion = { texto: string; valor: number }
export type Pregunta = {
  texto: string
  contexto: string
  areaDominante: Area
  areaSecundaria: Area
  opciones: Opcion[]
}

export const PREGUNTAS: Pregunta[] = [
  { texto: "Si no estás, ¿qué se detiene?", contexto: "Pensá en la última vez que te fuiste de vacaciones.", areaDominante: "organizacional", areaSecundaria: "personal", opciones: [
    { texto: "Todo se para", valor: 1 },
    { texto: "Se complica bastante", valor: 2 },
    { texto: "Hay algunos roces, pero sigue", valor: 3 },
    { texto: "Funciona igual que si estoy", valor: 4 }
  ]},
  { texto: "De tu facturación de este mes, ¿cuánto depende de 1 o 2 clientes grandes?", contexto: "Si esos dos te dejaran de comprar mañana, ¿qué pasa con la empresa?", areaDominante: "comercial", areaSecundaria: "empresarial", opciones: [
    { texto: "Casi todo. Si se van, estamos en problemas serios", valor: 1 },
    { texto: "Una parte grande, me preocupa", valor: 2 },
    { texto: "Algo, pero tengo otros clientes para sostenerme", valor: 3 },
    { texto: "Poco, la cartera está bien repartida", valor: 4 }
  ]},
  { texto: "Cuando un cliente importante pide condiciones que no te convienen, ¿qué hacés?", contexto: "La negociación real, no la que contás después.", areaDominante: "comercial", areaSecundaria: "personal", opciones: [
    { texto: "Cedo, no quiero perderlo", valor: 1 },
    { texto: "Cedo casi siempre, después me arrepiento", valor: 2 },
    { texto: "Negocio, a veces gano, a veces no", valor: 3 },
    { texto: "Tengo criterio claro y lo sostengo", valor: 4 }
  ]},
  { texto: "¿Tu equipo tira para el mismo lado?", contexto: "No el que querés tener. El que tenés hoy.", areaDominante: "organizacional", areaSecundaria: "personal", opciones: [
    { texto: "Cada uno interpreta a su manera", valor: 1 },
    { texto: "Hay roces silenciosos", valor: 2 },
    { texto: "Más o menos", valor: 3 },
    { texto: "Sí, hay alineación real", valor: 4 }
  ]},
  { texto: "¿Cuántas veces resolvés el mismo problema?", contexto: "Pensá en las últimas dos semanas.", areaDominante: "empresarial", areaSecundaria: "organizacional", opciones: [
    { texto: "Siempre los mismos, hay que explicar y volver a explicar", valor: 1 },
    { texto: "Con frecuencia, tranquilo", valor: 2 },
    { texto: "A veces, aprendemos lento", valor: 3 },
    { texto: "Raramente se repiten", valor: 4 }
  ]},
  { texto: "¿Quién maneja la relación comercial con tus clientes principales?", contexto: "No quién debería. Quién realmente atiende esa llamada.", areaDominante: "comercial", areaSecundaria: "empresarial", opciones: [
    { texto: "Yo, siempre yo", valor: 1 },
    { texto: "Yo, pero ya no debería ser así", valor: 2 },
    { texto: "Alguien del equipo, pero recurre a mí seguido", valor: 3 },
    { texto: "Mi equipo, yo ya no intervengo", valor: 4 }
  ]},
  { texto: "¿Ves tu negocio en 3 años?", contexto: "No la respuesta correcta. La real.", areaDominante: "empresarial", areaSecundaria: "personal", opciones: [
    { texto: "Voy viendo sobre la marcha", valor: 1 },
    { texto: "Tengo alguna idea vaga", valor: 2 },
    { texto: "La tengo clara, pero sin ejecutar ni bajarla", valor: 3 },
    { texto: "Tengo un plan concreto, bajado y funcionando", valor: 4 }
  ]},
  { texto: "Si subieras tus precios un 20% mañana, ¿qué pasa?", contexto: "La respuesta real, no la que te gustaría dar.", areaDominante: "comercial", areaSecundaria: "empresarial", opciones: [
    { texto: "Pierdo la mitad de mis clientes", valor: 1 },
    { texto: "Pierdo algunos clientes, me asusta probarlo", valor: 2 },
    { texto: "Algunos clientes se van, pero se compensa", valor: 3 },
    { texto: "Ningún cliente se mueve, ya lo hice antes", valor: 4 }
  ]}
]

export type RespuestaPosicion = "fundador" | "heredero" | "gerente"

export const PREGUNTA_POSICION = {
  texto: "¿Quién fundó esta empresa?",
  contexto: "La respuesta más simple.",
  opciones: [
    { texto: "Yo la fundé", valor: "fundador" as RespuestaPosicion },
    { texto: "La heredé de mi familia (2°, 3° generación o más)", valor: "heredero" as RespuestaPosicion },
    { texto: "Soy gerente/socio, no la fundé ni la heredé", valor: "gerente" as RespuestaPosicion }
  ]
}
