import { DesktopLayout, LeftPanel, QuestionCard } from 'mejora-diagnostico'

export function ConPregunta() {
  return (
    <DesktopLayout leftContent={<LeftPanel step="preguntas" preguntaIndex={2} />}>
      <div style={{ maxWidth: 480, margin: '64px auto', padding: '0 24px' }}>
        <QuestionCard
          texto="¿Tu equipo tira para el mismo lado?"
          numero={4}
          contexto="No el que querés tener. El que tenés hoy."
          opciones={[
            { texto: 'Cada uno interpreta a su manera', valor: 1 },
            { texto: 'Con roces silenciosos', valor: 2 },
            { texto: 'Más o menos', valor: 3 },
            { texto: 'Sí, hay alineación real', valor: 4 },
          ]}
          seleccionada={null}
          onSelect={() => {}}
        />
      </div>
    </DesktopLayout>
  )
}

export function Resultado() {
  return (
    <DesktopLayout
      leftContent={
        <LeftPanel step="resultado" perfilTag="El Líder sin Herramientas" perfilRef="TODO PASA POR VOS. Y NO ES PORQUE QUIERAS." />
      }
    >
      <div style={{ maxWidth: 480, margin: '64px auto', padding: '0 24px' }}>
        <h1 style={{ fontWeight: 700, fontSize: 28, color: '#0D0D0D' }}>Tu diagnóstico</h1>
        <p style={{ color: '#656565', marginTop: 8 }}>Resultado completo por área.</p>
      </div>
    </DesktopLayout>
  )
}
