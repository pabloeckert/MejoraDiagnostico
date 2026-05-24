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

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas → ingresa sus datos → ve su perfil y resultados. Tres rutas de usuario: `/diagnostico` → `/datos` → `/resultado`.

### Flujo de estado entre rutas

El estado no pasa por URL ni por un store global. Se usa `hooks/useDiagnostico.ts` que persiste en dos capas:
- **`sessionStorage`**: respuestas, perfil detectado y datos del formulario. Se pierde al cerrar la pestaña — diseño intencional para que cada sesión sea fresca.
- **`localStorage`**: colección de leads acumulada. Persiste entre sesiones y se puede exportar desde la consola del browser.

Cada página llama a helpers de `useDiagnostico` al montarse para leer el estado previo. Si no hay datos válidos, redirige hacia atrás.

### Lógica de negocio central

- **`lib/preguntas.ts`**: 8 preguntas, cada una con 4 opciones. Cada opción tiene un mapa de puntajes por área.
- **`lib/detectar.ts`**: toma el array de respuestas (índices 0-3), acumula puntajes, calcula el porcentaje por área y determina el perfil con reglas de prioridad.
- **`lib/areas.ts`**: 5 áreas — Liderazgo, Comercial, Procesos, Asesoramiento, Visión. Cada una tiene umbral `crítica` (<40%) / `media` (40-65%) / `sólida` (>65%).
- **`lib/perfiles.ts`**: 8 perfiles con campos `tag`, `ref`, `desc`, `verdad`, `cierre`, `waMsg`. Todos los textos de resultados salen de acá.

### API de email (`app/api/send-email/route.ts`)

Único endpoint server-side. Recibe el formulario + las 8 respuestas, valida con Zod, recalcula áreas y perfil server-side (no confía en datos del cliente), y envía dos emails en paralelo con Resend:
1. Al admin (`diagnostico@mejoraok.com`) con tabla de lead completa.
2. Al prospecto con su perfil personalizado.

La key de Resend vive en `RESEND_API_KEY` (sin prefijo `NEXT_PUBLIC_`) — es server-only por diseño. El endpoint tiene honeypot y checkbox de consentimiento validados en Zod.

### Componentes clave

- **`QuestionCard`**: baraja las opciones con `useMemo` para que el orden sea aleatorio pero estable durante el render.
- **`AreaBar`**: barra animada que cambia de color según la zona (crítica/media/sólida).
- **`PDFButton`**: genera el PDF con jsPDF en el cliente, incluyendo header, áreas y footer de marca.

## Colores y tipografía

Paleta en `tailwind.config.js`:
- `mc-azul`: #1C4D8C — color primario (CTAs, headers)
- `mc-rojo`: #D9072D — alertas, zona crítica
- `mc-amarillo`: #F2BB16 — zona media
- `mc-negro`: #0D0D0D — texto

Fuente global: League Spartan (cargada en `globals.css`). Los fontWeight deben usarse como clases Tailwind (`font-light`, `font-semibold`) — nunca inline.

## Variables de entorno

```
RESEND_API_KEY=          # API key de Resend (server-only)
WA_NUMBER=               # Número WhatsApp sin + para links de backend
NEXT_PUBLIC_WA_NUMBER=   # Mismo número, expuesto al cliente para links directos
```

Copiar `.env.example` a `.env.local` y completar antes de levantar el proyecto.
