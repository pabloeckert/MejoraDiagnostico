type LeftPanelProps = {
  step: 'inicio' | 'nombre' | 'preguntas' | 'datos' | 'resultado'
  preguntaNum?: number
  perfilTag?: string
  perfilRef?: string
}

export default function LeftPanel({ step, preguntaNum, perfilTag, perfilRef }: LeftPanelProps) {
  return (
    <div className="flex flex-col items-start w-full max-w-sm">

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-blanco.png" alt="Mejora Continua" className="h-14 sm:h-16 mb-10 object-contain" />

      {step === 'inicio' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Diagnóstico Empresarial
          </p>
          <h2 className="text-white text-3xl font-bold leading-tight mb-6">
            Descubrí dónde está tu negocio hoy.
          </h2>
          <div className="mt-12 flex flex-col gap-3">
            <span className="text-white/40 text-sm">✓ Gratis</span>
            <span className="text-white/40 text-sm">✓ Menos de 1 minuto</span>
            <span className="text-white/40 text-sm">✓ Sin spam</span>
          </div>
        </>
      )}

      {step === 'nombre' && (
        <p className="text-white text-3xl font-bold leading-tight">
          Contanos quién sos.
        </p>
      )}

      {step === 'preguntas' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Pregunta {preguntaNum}
          </p>
          <p className="text-white text-lg leading-relaxed">
            Respondé con lo primero que sentís.
          </p>
        </>
      )}

      {step === 'datos' && (
        <>
          <h2 className="text-white text-3xl font-bold leading-tight mb-6">
            Ya casi.
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Lo que encontramos en tu negocio te va a hacer pensar.
          </p>
        </>
      )}

      {step === 'resultado' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Tu perfil
          </p>
          <h2 className="text-white text-3xl font-bold leading-tight mb-4">
            {perfilTag}
          </h2>
          <p className="text-mc-amarillo font-bold text-sm leading-relaxed uppercase tracking-wide">
            {perfilRef}
          </p>
          <div className="mt-12 w-16 h-1 bg-mc-amarillo rounded-full" />
        </>
      )}

    </div>
  )
}
