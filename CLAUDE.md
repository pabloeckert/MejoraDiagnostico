# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev      # Dev server en localhost:3000
npm run build    # Build de producción
npm run lint     # ESLint
```

No hay suite de tests configurada. El README.md está desactualizado (referencia Web3Forms que ya no existe) — no lo uses como fuente de verdad.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS v3 · Resend (email) · Zod (validación server-side) · jsPDF (PDF cliente).

## Arquitectura general

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas → ve un teaser de su resultado → ingresa sus datos → ve el resultado completo desbloqueado. Rutas: `/` → `/diagnostico` → `/resultado` (teaser) → `/datos` → `/resultado` (completo). Existe también `/privacidad` (página estática).

Todas las páginas de usuario son `'use client'` — no hay Server Components en las rutas. El único código server-side es `app/api/send-email/route.ts`.

### Flujo de estado entre rutas

El estado no pasa por URL ni por un store global. Se usan funciones exportadas desde `hooks/useDiagnostico.ts` que persisten en estas capas:
- **`sessionStorage`** (clave `mc_diagnostico`): respuestas, perfil detectado y datos del formulario. Se pierde al cerrar la pestaña — diseño intencional para que cada sesión sea fresca.
- **`sessionStorage`** (clave `mc_nombre`): nombre ingresado en la bienvenida; pre-rellena el campo nombre en `/datos`.
- **`sessionStorage`** (clave `mc_lid`): identificador de contacto leído del query param `?lid=` en `/diagnostico`. Se envía a `/api/save-completion` para rastrear el origen del lead. Si no hay `?lid=`, no se envía.
- **`localStorage`** (clave `mc_leads`): colección de leads acumulada. Persiste entre sesiones; se puede exportar desde la consola con `JSON.parse(localStorage.getItem('mc_leads'))`.

Cada página lee el estado previo al montarse. Si no hay datos válidos, redirige hacia atrás. `hooks/useDiagnostico.ts` exporta principalmente funciones standalone (`guardarRespuestas`, `guardarPerfil`, `guardarDatos`, `cargarSession`, `guardarLead`) — importalas directamente, no a través del hook `useDiagnostico`.

### Flujo de notificaciones

Al terminar las 8 preguntas, `/diagnostico` llama a **`/api/save-completion`** (fire-and-forget) que envía solo un email al admin con perfil y áreas. Luego redirige a `/datos`. Cuando el usuario completa el formulario, `/datos` llama a **`/api/send-email`** que envía dos emails en paralelo (admin + prospecto). Ambos endpoints tienen la función `buildAreas()` definida localmente — no importan `calcularAreas` de `lib/areas.ts`.

### `/resultado`

Requiere `session.datos?.email`. Si no está, redirige a `/` sin mostrar nada. No hay teaser ni overlay — el resultado completo se muestra de una sola vez con WhatsApp y PDF.

### Lógica de negocio central

- **`lib/preguntas.ts`**: 8 preguntas, cada una con 4 opciones. Cada opción tiene un `valor` (1–4). Las respuestas se guardan como ese `valor` — no como índices. Puntaje máximo total: 32 (8 × 4).
- **`lib/detectar.ts`**: toma el array de respuestas `r[0..7]` y determina el perfil con reglas de prioridad sobre los valores 1-4 de cada posición. **Importante:** los índices en `detectarPerfil` refieren a posiciones fijas en `PREGUNTAS` — el orden de las preguntas no puede cambiar sin actualizar `detectarPerfil` y `AREAS`.
- **`lib/areas.ts`**: 5 áreas — Liderazgo y Autonomía, Desarrollo Comercial, Procesos Internos, Asesoramiento Externo, Visión Estratégica. Exporta `calcularAreas` (usado en el cliente) y `zonaColor` (usado en `AreaBar` y `PDFButton`). Los umbrales son: `Crítico` (<40%) / `En desarrollo` (40-65%) / `Sólido` (≥65%).
- **`lib/perfiles.ts`**: 8 perfiles. Cada perfil tiene: `tag`, `ref`, `desc`, `verdad`, `cierreTitulo`, `cierreTxt`, `cta`, `waMsg`. Todos los textos de resultados salen de acá. El tipo exportado es `PerfilKey`.

### APIs server-side

**`app/api/save-completion/route.ts`** — Se llama al terminar las preguntas, antes del formulario. Recibe `{ respuestas, lid? }`. No valida datos de contacto (no los tiene aún). Envía un email solo al admin con perfil, áreas y el `lid` si está presente.

**`app/api/send-email/route.ts`** — Se llama al enviar el formulario de datos. Recibe formulario + respuestas, valida con Zod, recalcula perfil y áreas server-side, y envía dos emails en paralelo: al admin con tabla completa del lead, y al prospecto con su perfil personalizado. Tiene honeypot y checkbox de consentimiento validados en Zod.

Ambos usan `RESEND_API_KEY` (sin prefijo `NEXT_PUBLIC_`) y definen `buildAreas()` localmente. **Si se modifica `AREAS`, hay que actualizar `lib/areas.ts` y ambos routes.**

**Captura de leads:** `guardarLead` se llama en el cliente *antes* de la llamada a `send-email`. Si el email falla, el lead queda en `localStorage` de todas formas. El error se silencia y el usuario avanza a `/resultado`.

### Layout desktop

Todas las páginas usan **`DesktopLayout`**: panel izquierdo fijo `bg-mc-azul-marino` (42% ancho) + contenido derecho (58%). El panel izquierdo solo se muestra en `lg+`; en mobile se usa un header con logo. **`LeftPanel`** va adentro del panel izquierdo y cambia su contenido según el `step` (`inicio` / `preguntas` / `datos` / `resultado`).

### Componentes

- **`QuestionCard`**: baraja las opciones con `useMemo` para que el orden visual sea aleatorio pero estable durante el render. El scoring no se ve afectado porque se guarda el `valor` intrínseco de la opción (1-4), no su posición en pantalla.
- **`ProgressBar`**: barra de progreso que indica en qué pregunta va el usuario.
- **`AreaBar`**: barra animada que cambia de color según la zona usando `zonaColor` de `lib/areas.ts`.
- **`PDFButton`**: importa jsPDF dinámicamente (`import('jspdf')`) para no inflar el bundle inicial. Genera el PDF en el cliente.

## Colores y tipografía

Paleta en `tailwind.config.js`:
- `mc-azul`: #1C4D8C — color primario (CTAs, headers)
- `mc-azul-marino`: #020659 — hover de CTAs
- `mc-rojo`: #D9072D — alertas, zona crítica
- `mc-amarillo`: #F2BB16 — zona media
- `mc-negro`: #0D0D0D — texto principal
- `mc-gris`: #656565 — texto secundario
- `mc-gris-claro`: #F2F2F2 — fondos de cards

**Importante:** `zonaColor` en `lib/areas.ts` usa colores propios (#C0392B, #E67E22, #27AE60) distintos a la paleta mc-*. Son colores semáforo para las barras de área y el PDF — no los reemplaces con variables Tailwind.

Fuente global: League Spartan (cargada en `globals.css`), disponible como `font-spartan`. Los pesos son clases numéricas Tailwind (`font-300`, `font-400`, `font-600`, `font-700`) — nunca usar `fontWeight` inline.

**Convención de estilos:** el código mezcla clases Tailwind con `style={}` inline deliberadamente. Tailwind para colores, espaciado y tipografía estándar; `style={}` para `clamp()`, valores exactos en píxeles, y propiedades que Tailwind no puede expresar directamente. Esto es intencional, no una inconsistencia a corregir.

## Variables de entorno

```
RESEND_API_KEY=          # API key de Resend (server-only)
NEXT_PUBLIC_WA_NUMBER=   # Número WhatsApp sin + para el link de WhatsApp en /resultado
WA_NUMBER=               # Está en .env.example pero actualmente no se usa en el código
```

Copiar `.env.example` a `.env.local` y completar antes de levantar el proyecto.
