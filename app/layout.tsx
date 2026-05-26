import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Diagnóstico Empresarial · Mejora Continua',
  description: 'Descubrí en menos de 1 minuto el perfil de tu negocio y qué necesitás para crecer.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-spartan">
        {children}
      </body>
    </html>
  )
}
