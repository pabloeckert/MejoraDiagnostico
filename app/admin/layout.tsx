import type { Metadata } from 'next'

// El panel admin nunca debe indexarse ni aparecer en buscadores.
export const metadata: Metadata = {
  title: 'Panel de Monitoreo · Mejora Continua',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
