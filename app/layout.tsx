import type { Metadata, Viewport } from 'next'
import { League_Spartan } from 'next/font/google'
import './globals.css'

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
  variable: '--font-league-spartan',
})

export const metadata: Metadata = {
  title: 'Diagnóstico Empresarial · Mejora Continua',
  description: 'Descubrí en menos de 1 minuto el perfil de tu negocio y qué necesitás para crecer.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#020659' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={leagueSpartan.variable}>
      <body className="font-spartan">
        {children}
      </body>
    </html>
  )
}
