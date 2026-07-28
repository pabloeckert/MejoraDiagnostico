import type { MetadataRoute } from 'next'

// Bloquea el panel admin, la herramienta interna de preview y las APIs de
// los buscadores. El resto del flujo de diagnóstico se puede indexar normalmente.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/preview', '/api/'],
    },
  }
}
