import { LeftPanel } from 'mejora-diagnostico'

// LeftPanel is always rendered inside DesktopLayout's dark left column —
// its text is white/amarillo by design, so previews wrap it in that bg.
function OnDark({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#020659', padding: '48px 32px', minHeight: 320 }}>
      {children}
    </div>
  )
}

export function Inicio() {
  return <OnDark><LeftPanel step="inicio" /></OnDark>
}

export function Preguntas() {
  return <OnDark><LeftPanel step="preguntas" preguntaIndex={2} /></OnDark>
}

export function Resultado() {
  return (
    <OnDark>
      <LeftPanel step="resultado" perfilTag="El Líder sin Herramientas" perfilRef="TODO PASA POR VOS. Y NO ES PORQUE QUIERAS." />
    </OnDark>
  )
}
