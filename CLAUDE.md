# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev      # Dev server en localhost:3000
npm run build    # Build de producción
npm run lint     # ESLint
```

No hay suite de tests configurada.

## Arquitectura general

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas → ingresa sus datos → ve su perfil y resultados. Tres rutas de usuario: `/diagnostico` → `/datos` → `/resultado`. Existe también `/privacidad` (página estática de política de datos).

### Flujo de estado entre rutas

El estado no pasa por URL ni por un store global. Se usa `hooks/useDiagnostico.ts` que persiste en dos capas:
- **`sessionStorage`** (clave `mc_diagnostico`): respuestas, perfil detectado y datos del formulario. Se pierde al cerrar la pestaña — diseño intencional para que cada sesión sea fresca.
- **`localStorage`** (clave `mc_leads`): colección de leads acumulada. Persiste entre sesiones; se puede exportar desde la consola con `JSON.parse(localStorage.getItem('mc_leads'))`.

Cada página llama a helpers de `useDiagnostico` al montarse para leer el estado previo. Si no hay datos válidos, redirige hacia atrás.

Todas las páginas son `'use client'` — no hay Server Components en las rutas de usuario.

### Lógica de negocio central

- **`lib/preguntas.ts`**: 8 preguntas, cada una con 4 opciones. Cada opción tiene un mapa de puntajes por área. Las respuestas se guardan como índices (0-3), el puntaje máximo total es 32.
- **`lib/detectar.ts`**: toma el array de respuestas (índices 0-3), acumula puntajes, calcula el porcentaje por área y determina el perfil con reglas de prioridad.
- **`lib/areas.ts`**: 5 áreas — Liderazgo, Comercial, Procesos, Asesoramiento, Visión. Umbrales: `crítica` (<40%) / `media` (40-65%) / `sólida` (>65%).
- **`lib/perfiles.ts`**: 8 perfiles. Cada perfil tiene: `tag`, `ref`, `desc`, `verdad`, `cierreTitulo`, `cierreTxt`, `cta`, `waMsg`. Todos los textos de resultados salen de acá. El tipo exportado es `PerfilKey`.

### API de email (`app/api/send-email/route.ts`)

Único endpoint server-side. Recibe el formulario + las 8 respuestas, valida con Zod, recalcula áreas y perfil server-side (no confía en datos del cliente), y envía dos emails en paralelo con Resend:
1. Al admin (`diagnostico@mejoraok.com`) con tabla de lead completa.
2. Al prospecto con su perfil personalizado.

La key de Resend vive en `RESEND_API_KEY` (sin prefijo `NEXT_PUBLIC_`) — es server-only por diseño. El endpoint tiene honeypot y checkbox de consentimiento validados en Zod.

### Componentes

- **`QuestionCard`**: baraja las opciones con `useMemo` para que el orden sea aleatorio pero estable durante el render.
- **`ProgressBar`**: barra de progreso que indica en qué pregunta va el usuario.
- **`AreaBar`**: barra animada que cambia de color según la zona (crítica/media/sólida).
- **`PDFButton`**: genera el PDF con jsPDF en el cliente, incluyendo header, áreas y footer de marca.

## Colores y tipografía

Paleta en `tailwind.config.js`:
- `mc-azul`: #1C4D8C — color primario (CTAs, headers)
- `mc-azul-marino`: #020659 — hover de CTAs
- `mc-rojo`: #D9072D — alertas, zona crítica
- `mc-amarillo`: #F2BB16 — zona media
- `mc-negro`: #0D0D0D — texto principal
- `mc-gris`: #656565 — texto secundario
- `mc-gris-claro`: #F2F2F2 — fondos de cards

Fuente global: League Spartan (cargada en `globals.css`), disponible como `font-spartan`. Los pesos son clases numéricas Tailwind (`font-300`, `font-400`, `font-600`, `font-700`) — nunca usar `fontWeight` inline.

## Variables de entorno

```
RESEND_API_KEY=          # API key de Resend (server-only)
WA_NUMBER=               # Número WhatsApp sin + para links de backend
NEXT_PUBLIC_WA_NUMBER=   # Mismo número, expuesto al cliente para links directos
```

Copiar `.env.example` a `.env.local` y completar antes de levantar el proyecto.
