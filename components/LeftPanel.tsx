type LeftPanelProps = {
  step: 'inicio' | 'preguntas' | 'datos' | 'resultado'
  preguntaNum?: number
  areaNombre?: string
  perfilTag?: string
  perfilRef?: string
}

export default function LeftPanel({ step, preguntaNum, areaNombre, perfilTag, perfilRef }: LeftPanelProps) {
  return (
    <div className="flex flex-col items-start w-full max-w-sm">

      {/* Logo siempre visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Mejora Continua" className="h-10 mb-12 brightness-0 invert" />

      {step === 'inicio' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Diagnóstico Empresarial
          </p>
          <h2 className="text-white text-3xl font-bold leading-tight mb-6">
            Descubrí dónde está tu negocio hoy.
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            8 preguntas. Tu perfil real. Lo que nadie te dice de tu negocio.
          </p>
          <div className="mt-12 flex flex-col gap-3">
            <span className="text-white/40 text-sm">✓ Gratis</span>
            <span className="text-white/40 text-sm">✓ Menos de 1 minuto</span>
            <span className="text-white/40 text-sm">✓ Sin spam</span>
          </div>
        </>
      )}

      {step === 'preguntas' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Pregunta {preguntaNum} de 8
          </p>
          <h2 className="text-white text-2xl font-bold leading-tight mb-4">
            Evaluando
          </h2>
          <p className="text-white text-3xl font-bold leading-tight">
            {areaNombre}
          </p>
          <div className="mt-12 w-full bg-white/10 rounded-full h-1">
            <div
              className="bg-mc-amarillo h-1 rounded-full transition-all duration-500"
              style={{ width: `${((preguntaNum || 1) / 8) * 100}%` }}
            />
          </div>
        </>
      )}

      {step === 'datos' && (
        <>
          <p className="text-mc-amarillo text-xs font-bold tracking-widest uppercase mb-4">
            Casi listo
          </p>
          <h2 className="text-white text-3xl font-bold leading-tight mb-6">
            Tu diagnóstico está listo.
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Ingresá tus datos y recibís el análisis completo en tu email en segundos.
          </p>
          <div className="mt-12 p-6 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Lo que recibís</p>
            <p className="text-white text-sm leading-relaxed">
              Tu perfil detectado, diagnóstico por área, plan de acción y contacto directo con el equipo.
            </p>
          </div>
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
