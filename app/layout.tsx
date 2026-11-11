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
  openGraph: {
    title: '¿Cuál es el verdadero cuello de botella de tu empresa? (Diagnóstico 4D en 2 minutos)',
    description: 'Evaluación estratégica para líderes y fundadores. Identificá en 4 dimensiones el obstáculo exacto de tu negocio.',
    url: 'https://diagnostico.mejoraok.com',
    siteName: 'Mejora Continua',
    images: [
      {
        url: '/logo-color.png',
        width: 800,
        height: 600,
        alt: 'Isotipo Oficial Mejora Continua',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '¿Cuál es el verdadero cuello de botella de tu empresa? (Diagnóstico 4D en 2 minutos)',
    description: 'Evaluación estratégica para líderes y fundadores. Identificá en 4 dimensiones el obstáculo exacto de tu negocio.',
    images: ['/logo-color.png'],
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
