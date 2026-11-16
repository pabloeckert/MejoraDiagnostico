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
  metadataBase: new URL('https://diagnostico.mejoraok.com'),
  title: '¿Cuál es el verdadero cuello de botella de tu empresa? (Diagnóstico 4D en 2 minutos)',
  description: 'Evaluación estratégica para líderes y fundadores. Identificá en 4 dimensiones el obstáculo exacto de tu negocio.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: '¿Cuál es el verdadero cuello de botella de tu empresa? (Diagnóstico 4D en 2 minutos)',
    description: 'Evaluación estratégica para líderes y fundadores. Identificá en 4 dimensiones el obstáculo exacto de tu negocio.',
    url: 'https://diagnostico.mejoraok.com',
    siteName: 'Mejora Continua',
    images: [
      {
        url: '/og-diagnostico.png',
        width: 1200,
        height: 630,
        alt: 'Mejora Continua — Diagnóstico Empresarial 4D',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '¿Cuál es el verdadero cuello de botella de tu empresa? (Diagnóstico 4D en 2 minutos)',
    description: 'Evaluación estratégica para líderes y fundadores. Identificá en 4 dimensiones el obstáculo exacto de tu negocio.',
    images: ['/og-diagnostico.png'],
  },
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
      <body>
        {children}
      </body>
    </html>
  )
}
