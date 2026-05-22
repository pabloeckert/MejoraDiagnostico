export type Opcion = { texto: string; valor: number }
export type Pregunta = { texto: string; area: number; opciones: Opcion[] }

export const PREGUNTAS: Pregunta[] = [
  { texto: "Si no estás, ¿qué pasa?", area: 0, opciones: [
    { texto: "Todo se para", valor: 1 },
    { texto: "Se complica bastante", valor: 2 },
    { texto: "Hay algunos roces, pero sigue", valor: 3 },
    { texto: "Funciona igual que si estoy", valor: 4 }
  ]},
  { texto: "Tus clientes nuevos llegan...", area: 1, opciones: [
    { texto: "Esperándolos", valor: 1 },
    { texto: "Solo por recomendación", valor: 2 },
    { texto: "Sin sistema claro", valor: 3 },
    { texto: "De forma enteramente predecible", valor: 4 }
  ]},
  { texto: "Cuando el cliente dice \"está caro\"...", area: 1, opciones: [
    { texto: "Bajo el precio, \"al toque\"", valor: 1 },
    { texto: "Pierdo la venta", valor: 2 },
    { texto: "Lo intento convencer, a veces funciona", valor: 3 },
    { texto: "Manejo bien la objeción", valor: 4 }
  ]},
  { texto: "¿Tu equipo tira para el mismo lado?", area: 0, opciones: [
    { texto: "Cada uno interpreta a su manera", valor: 1 },
    { texto: "Con roces silenciosos", valor: 2 },
    { texto: "Más o menos", valor: 3 },
    { texto: "Sí, hay alineación real", valor: 4 }
  ]},
  { texto: "¿Cuántas veces resolvés los mismos problemas?", area: 2, opciones: [
    { texto: "Siempre los mismos, hay que explicar y volver a explicar", valor: 1 },
    { texto: "Con frecuencia, tranquilo", valor: 2 },
    { texto: "A veces, aprendemos lento", valor: 3 },
    { texto: "Raramente se repiten", valor: 4 }
  ]},
  { texto: "Sinceramente, la verdad con los asesores que tengo...", area: 3, opciones: [
    { texto: "La verdad, creo que me venden humo", valor: 1 },
    { texto: "Tengo mis dudas", valor: 2 },
    { texto: "Cumplen, solo eso, pero me falta más", valor: 3 },
    { texto: "Confío 100% en ellos. Estoy seguro", valor: 4 }
  ]},
  { texto: "¿Ves tu negocio en 3 años?", area: 4, opciones: [
    { texto: "Voy viendo sobre la marcha", valor: 1 },
    { texto: "Tengo alguna idea vaga", valor: 2 },
    { texto: "La tengo clara, pero sin ejecutar ni bajarla", valor: 3 },
    { texto: "Tengo un plan concreto, bajado y funcionando", valor: 4 }
  ]},
  { texto: "¿Cómo definirías tu momento hoy?", area: 2, opciones: [
    { texto: "Caos total", valor: 1 },
    { texto: "Creciendo, pero sin estructura", valor: 2 },
    { texto: "Estable, pero quiero más", valor: 3 },
    { texto: "Ordenado y avanzando", valor: 4 }
  ]}
]
