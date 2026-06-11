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

Next.js 14.2.35 (App Router) · React 18 · TypeScript · Tailwind CSS v3 · Resend (email) · Zod (validación server-side) · jsPDF (PDF cliente).

## Arquitectura general

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas → ve un teaser de su resultado → ingresa sus datos → ve el resultado completo desbloqueado. Rutas: `/` → `/diagnostico` → `/resultado` (teaser) → `/datos` → `/resultado` (completo). Existe también `/privacidad` (página estática) y `/gracias` (página final).

Todas las páginas de usuario son `'use client'` — no hay Server Components en las rutas.

### Flujo de estado entre rutas

El estado se maneja y persiste a través de `sessionStorage` y `localStorage` desde `hooks/useDiagnostico.ts`:
- **`sessionStorage`** (clave `mc_diagnostico`): respuestas, perfil detectado y datos del formulario. Se pierde al cerrar la pestaña — diseño intencional para que cada sesión sea fresca.
- **`sessionStorage`** (clave `mc_nombre`): nombre ingresado en la bienvenida; pre-rellena el campo nombre en `/datos`.
- **`sessionStorage`** (clave `mc_lid`): identificador de contacto leído del query param `?lid=` en `/diagnostico`. Se envía a `/api/save-completion` para rastrear el origen del lead. Si no hay `?lid=`, no se envía.
- **`localStorage`** (clave `mc_leads`): colección de leads acumulada. Persiste entre sesiones; se puede exportar desde la consola con `JSON.parse(localStorage.getItem('mc_leads'))`.

### Flujo de notificaciones y triggers (CRO optimizado)

1. Al terminar las 8 preguntas, `/diagnostico` llama a **`/api/save-completion`** (fire-and-forget) que envía un email al admin con perfil y áreas. Luego redirige a `/datos`.
2. Cuando el usuario completa el formulario de WhatsApp en `/datos`:
   - Llama a **`/api/send-email`** para enviar el correo del lead al admin.
   - Llama a **`/api/notify`** de inmediato para enviar la alerta de Telegram a Sindy con los datos de contacto del lead (antes se llamaba en el CTA de resultados, se movió aquí para evitar pérdidas de leads por abandono).
   - Registra el evento `formulario_completado` en el funnel de Google Sheets.
   - Redirige a `/resultado`.

### `/resultado`

- Requiere `session.datos?.email`. Si no está, redirige a `/` sin mostrar nada.
- El CTA de WhatsApp recupera la variable de entorno `NEXT_PUBLIC_WA_NUMBER` (fallbacks locales incluidos) y el mensaje predeterminado por perfil (`p.waMsg`). Abre una nueva pestaña de WhatsApp directo con el chat de Sindy y redirige la ventana actual a `/gracias`.
- Dispara el evento `cta_click` que actualiza la columna **`R`** de Google Sheets a `'SÍ'`.
- Presenta las 5 áreas evaluadas usando un **grid de 3 columnas en mobile** (`grid-cols-3`) para garantizar visibilidad sin scroll horizontal, y flex-row en desktop.

### Lógica de negocio central

- **`lib/preguntas.ts`**: 8 preguntas, cada una con 4 opciones. Cada opción tiene un `valor` (1–4). Las respuestas se guardan como ese `valor` — no como índices. Puntaje máximo total: 32 (8 × 4).
- **`lib/detectar.ts`**: determina el perfil con reglas de prioridad sobre los valores 1-4 de cada posición. Los índices en `detectarPerfil` refieren a posiciones fijas en `PREGUNTAS` — el orden de las preguntas no puede cambiar sin actualizar `detectarPerfil` y `AREAS`.
- **`lib/areas.ts`**: 5 áreas — Liderazgo y Autonomía, Desarrollo Comercial, Procesos Internos, Asesoramiento Externo, Visión Estratégica. Exporta `calcularAreas` (usado tanto en el cliente como en APIs del backend) y `zonaColor` para unificar el semáforo: `Crítico` (<40%) / `En desarrollo` (40-65%) / `Sólido` (≥65%).
- **`lib/perfiles.ts`**: 8 perfiles. Cada perfil tiene: `tag`, `ref`, `desc`, `verdad`, `cierreTitulo`, `cierreTxt`, `cta`, `waMsg`.

### APIs server-side

- **`/api/save-completion`**: Recibe `{ respuestas, lid? }`. Envía un email al admin con el reporte inicial. Utiliza `calcularAreas` y `zonaColor` de `lib/areas.ts` para los textos y porcentajes.
- **`/api/send-email`**: Recibe formulario + respuestas. Envía el reporte de lead completo al admin. Utiliza `calcularAreas` y `zonaColor` de `lib/areas.ts` para consistencia absoluta de las zonas críticas.
- **`/api/notify`**: Envía el mensaje de Telegram a Sindy vía Telegram Bot API. Se invoca al enviar el formulario en `/datos`.
- **`/api/funnel`**: Actualiza el embudo en Google Sheets celda por celda usando `updateCell`.
  - Columna A: `sessionId`
  - Columna B: `fecha`
  - Columna C: `nombre`
  - Columna D: `whatsapp`
  - Columna E: `perfil`
  - Columna F: `paso`
  - Columnas G-N: `P1`-`P8` respuestas
  - Columna O: `resultado_visto` (`SÍ` / `NO`)
  - Columna P: `abandono`
  - Columna Q: `último timestamp`
  - Columna R: `cta_click` (`SÍ` / `NO`, inicializado en `NO`, modificado al hacer clic en WhatsApp en resultados)

*Nota de compilación:* Tanto `/api/save-completion` como `/api/send-email` inicializan Resend con un fallback: `new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build')` para evitar fallas en builds locales o de CI donde las variables no estén expuestas.

## Diseño y Estilos

- Colores principales en `tailwind.config.js`: `mc-azul` (#1C4D8C), `mc-azul-marino` (#020659), `mc-rojo` (#D9072D), `mc-amarillo` (#F2BB16), `mc-negro` (#0D0D0D), `mc-gris` (#656565).
- Semáforo de áreas usa colores definidos en `lib/areas.ts` (#C0392B, #E67E22, #27AE60). No los reemplace.
- Tipografía global: `League Spartan` cargada en `globals.css` (usar clases `font-300`, `font-400`, `font-600`, `font-700`).

---

## Mejoras futuras recomendadas para Claude Code

1. **Google Sheets batchUpdate:** Optimizar `/api/funnel/route.ts` para usar `spreadsheets.values.batchUpdate` en lugar de llamadas secuenciales `updateCell`. Esto reducirá la latencia de red en móviles.
2. **Revisar visualización de PDF:** Asegurar que `components/PDFButton.tsx` dibuja los colores del semáforo unificados según `lib/areas.ts`.
3. **Persistencia fallback:** Evaluar cookies o `localStorage` temporal para prevenir pérdidas de estado en recargas móviles accidentales antes de llegar a `/datos`.
