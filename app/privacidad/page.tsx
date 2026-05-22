export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="w-full max-w-[680px] mx-auto">
        <h1 className="text-3xl font-spartan font-700 text-mc-negro mb-10 uppercase tracking-wide">
          Política de privacidad
        </h1>

        <section className="flex flex-col gap-8 font-spartan text-base text-mc-negro leading-relaxed">
          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Responsable</h2>
            <p>Mejora Continua — <a href="mailto:diagnostico@mejoraok.com" className="underline">diagnostico@mejoraok.com</a></p>
          </div>

          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Datos que recopilamos</h2>
            <p>Nombre, apellido, empresa, WhatsApp y dirección de correo electrónico.</p>
          </div>

          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Finalidad</h2>
            <p>Envío del diagnóstico personalizado y contacto comercial posterior.</p>
          </div>

          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Base legal</h2>
            <p>Consentimiento expreso del interesado al completar el formulario.</p>
          </div>

          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Tus derechos</h2>
            <p>
              Podés acceder, rectificar o solicitar la supresión de tus datos escribiendo a{' '}
              <a href="mailto:diagnostico@mejoraok.com" className="underline">diagnostico@mejoraok.com</a>.
            </p>
          </div>

          <div>
            <h2 className="font-700 uppercase tracking-wider text-sm text-mc-azul mb-2">Conservación</h2>
            <p>Tus datos se conservan hasta que solicites la baja.</p>
          </div>
        </section>

        <div className="mt-14 pt-8 border-t border-gray-100">
          <a href="/" className="font-spartan text-sm text-mc-azul hover:underline">
            ← Volver al diagnóstico
          </a>
        </div>
      </div>
    </main>
  )
}
