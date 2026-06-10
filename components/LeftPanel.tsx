const FRASES_PREGUNTAS = [
  "Tu negocio habla por vos.",
  "Los números no mienten.",
  "Lo que hacés cuando presionan define tu negocio.",
  "Un equipo alineado vale más que uno brillante.",
  "Si se repite, no es mala suerte.",
  "El asesor que no te incomoda no te está ayudando.",
  "Sin destino claro, cualquier camino parece bueno.",
  "La respuesta más honesta es la primera que pensaste."
]

type LeftPanelProps = {
  step: 'inicio' | 'nombre' | 'preguntas' | 'datos' | 'resultado'
  preguntaIndex?: number
  perfilTag?: string
  perfilRef?: string
}

export default function LeftPanel({ step, preguntaIndex, perfilTag, perfilRef }: LeftPanelProps) {
  return (
    <div className="flex flex-col items-start w-full max-w-sm">

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-blanco.png" alt="Mejora Continua" className="h-14 sm:h-16 mb-10 object-contain" />

      {step === 'inicio' && (
        <p className="text-white text-3xl font-bold leading-tight">
          Descubrí dónde está tu negocio hoy.
        </p>
      )}

      {step === 'nombre' && (
        <>
          <p className="text-white text-3xl font-bold leading-tight mb-3">
            Antes de empezar,
          </p>
          <p className="text-white/60 text-base leading-relaxed">
            necesitamos saber a quién le estamos hablando.
          </p>
        </>
      )}

      {step === 'preguntas' && (
        <>
          <p className="text-white text-3xl font-bold leading-tight mb-3">
            {FRASES_PREGUNTAS[preguntaIndex ?? 0]}
          </p>
          <p className="text-white/60 text-base leading-relaxed">
            Respondé con lo primero que sentís.
          </p>
        </>
      )}

      {step === 'datos' && (
        <>
          <p className="text-white text-3xl font-bold leading-tight mb-3">
            Ya casi.
          </p>
          <p className="text-white/60 text-base leading-relaxed">
            Lo que encontramos te va a hacer pensar.
          </p>
        </>
      )}

      {step === 'resultado' && (
        <>
          <p className="text-white text-3xl font-bold leading-tight mb-3">
            {perfilTag}
          </p>
          <p className="text-mc-amarillo text-xs font-bold uppercase tracking-wide">
            {perfilRef}
          </p>
        </>
      )}

    </div>
  )
}
