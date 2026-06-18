# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev      # Dev server en localhost:3000
npm run build    # Build de producción
npm run lint     # ESLint
```

No hay suite de tests configurada (unit/integration). El README.md está desactualizado — no lo uses como fuente de verdad.

### Scripts de verificación (`scripts/`)

No son parte de `npm run`, se ejecutan manualmente con `node` (requieren `npm run dev` corriendo en `localhost:3000`):

- `node scripts/verify_e2e.mjs` — recorre el flujo completo con Playwright para varios escenarios de respuestas y compara el perfil resultante contra el esperado.
- `node scripts/verify_8perfiles.mjs` — variante que cubre los 8 perfiles, generando capturas en `scripts/screenshots/`.
- `npx tsx scripts/validar-perfiles.ts` (o equivalente) — recorre combinatoriamente las respuestas posibles y valida la distribución de perfiles contra `lib/scoring.ts` sin levantar el navegador.
- `scripts/crear-sheet-funnel.ts`, `scripts/formatear-sheet-funnel.ts`, `scripts/leer-ultima-fila.ts` — utilidades puntuales para inicializar/inspeccionar la hoja de Google Sheets del funnel.

`scripts/screenshots/` y `scripts/verify-prod.mjs` están en `.gitignore` (artefactos/regenerables, no commitear).

## Stack

Next.js 14.2.35 (App Router) · React 18 · TypeScript · Tailwind CSS v3 · Resend (email) · Google Sheets API (funnel) · Telegram Bot API (notificaciones) · Zod (validación server-side) · jsPDF (PDF cliente).

## Arquitectura general

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas (más una 9ª opcional de posición) → ingresa sus datos → ve el resultado completo. Rutas: `/` → `/diagnostico` → `/datos` → `/resultado`. Existe también `/privacidad` (página estática) y `/gracias` (página final post-CTA).

Todas las páginas de usuario son `'use client'` — no hay Server Components en las rutas.

### Flujo de estado entre rutas

El estado se maneja y persiste a través de `sessionStorage` desde `hooks/useDiagnostico.ts`:
- **`sessionStorage`** (clave `mc_diagnostico`): respuestas, perfil detectado, scores, posición y datos del formulario. Se pierde al cerrar la pestaña — diseño intencional.
- **`sessionStorage`** (clave `mc_lid`): identificador de contacto leído del query param `?lid=` en `/diagnostico`. Se envía a `/api/save-completion` para rastrear el origen del lead. Si no hay `?lid=`, no se envía.
- **`localStorage`** (clave `mc_leads`): colección de leads acumulada. Persiste entre sesiones; se puede exportar desde la consola con `JSON.parse(localStorage.getItem('mc_leads'))`.

### Flujo de notificaciones y triggers (CRO optimizado)

1. Al terminar las preguntas, `/diagnostico` llama a **`/api/save-completion`** (fire-and-forget) que envía un email al admin con perfil y áreas. Luego redirige a `/datos`.
2. Cuando el usuario completa el formulario de WhatsApp en `/datos`:
   - Llama a **`/api/send-email`** para enviar el correo del lead al admin.
   - Llama a **`/api/notify`** para enviar la alerta de Telegram a Sindy con los datos de contacto.
   - Registra el evento `formulario_completado` en el funnel de Google Sheets.
   - Redirige a `/resultado`.

### `/resultado`

- Requiere `session.perfil`, `session.respuestas` y `session.datos?.whatsapp`. Si falta alguno, redirige a `/`.
- El CTA de WhatsApp recupera `NEXT_PUBLIC_WA_NUMBER` y el mensaje predeterminado por perfil (`p.waMsg`). Abre una nueva pestaña de WhatsApp y redirige la ventana actual a `/gracias`.
- Dispara el evento `cta_click` que actualiza la columna **`R`** de Google Sheets a `'SÍ'`.

### Lógica de negocio central

- **`lib/preguntas.ts`**: 8 preguntas, cada una con 4 opciones (valor 1–4) y dos áreas ponderadas (`areaDominante`, `areaSecundaria`). Exporta también `PREGUNTA_POSICION` — una 9ª pregunta sobre rol (fundador / heredero / gerente) que solo se muestra cuando `requierePosicion()` retorna `true`.

- **`lib/scoring.ts`**: núcleo de la lógica de evaluación.
  - `calcularScores(respuestas)` → `Scores` (objeto con 4 áreas en porcentaje 0-100, usando ponderación 70%/30% dominante/secundaria).
  - `requierePosicion(scores)` → `boolean` — `true` cuando las áreas más débiles forman un par ambiguo que requiere saber el rol del usuario para distinguir perfil.
  - `detectarPerfil(scores, posicion?)` → `PerfilKey` — determina el perfil final con reglas de prioridad sobre los scores y la posición.
  - `areasMasDebiles(scores)` → `[Area, Area]` — las dos áreas con menor puntaje.
  - Tipos exportados: `Area` (`"personal" | "organizacional" | "comercial" | "empresarial"`), `Scores`, `PerfilKey`.

- **`lib/detectar.ts`**: shim de compatibilidad que re-exporta `detectarPerfil` y `PerfilKey` desde `lib/scoring.ts`/`lib/perfiles.ts`. No agregar lógica nueva ahí — el sistema vigente es `lib/scoring.ts`.

- **`lib/areas.ts`**: presentación de las 4 áreas.
  - `areasParaMostrar(scores)` → array de `{ nombre, porcentaje }` para renderizar.
  - `zonaColor(p)` → `{ zona, color }` — semáforo: `Crítico` (<40%, `#C0392B`) / `En desarrollo` (40-65%, `#E67E22`) / `Sólido` (≥65%, `#27AE60`).
  - `NOMBRES_AREA`: mapeo de clave de área a nombre para mostrar.

- **`lib/perfiles.ts`**: 8 perfiles. Cada perfil tiene: `tag`, `ref`, `desc`, `verdad`, `cierreTitulo`, `cierreTxt`, `cta`, `waMsg`, `saludo`. Los 8 perfiles: `SATURADO`, `LIDER_QUE_NECESITA_APOYO`, `INDEPENDIENTE_EN_CRECIMIENTO`, `EQUIPO_DESALINEADO`, `ESCEPTICO`, `NUEVA_GENERACION`, `AREA_COMERCIAL_SIN_RESULTADOS`, `SIN_PROFESIONALIZAR_LA_EMPRESA`.

### APIs server-side

- **`/api/save-completion`**: Recibe `{ respuestas, lid? }`. Envía email al admin con el reporte inicial. Inicializa Resend con fallback `|| 're_placeholder_for_build'` para builds sin env vars.
- **`/api/send-email`**: Recibe formulario + respuestas. Envía reporte de lead completo al admin. Mismo fallback de Resend.
- **`/api/notify`**: Envía mensaje de Telegram a Sindy vía Telegram Bot API. Se invoca al enviar el formulario en `/datos`.
- **`/api/funnel`**: Actualiza el embudo en Google Sheets celda por celda usando `updateCell` (individual, no batch).
  - Col A: `sessionId` | B: `fecha` | C: `nombre` | D: `whatsapp` | E: `perfil` | F: `paso`
  - Cols G-N: `P1`-`P8` respuestas (texto completo de la opción seleccionada)
  - Col O: `resultado_visto` (`SÍ`/`NO`) | P: `abandono` | Q: `último timestamp` | R: `cta_click` (`SÍ`/`NO`)

### `lib/funnel.ts`

Cliente de tracking. `trackFunnel(evento, datos?)` envía fire-and-forget a `/api/funnel`. Usa `crypto.randomUUID()` para generar un `sessionId` persistido en `sessionStorage` bajo `mc_session_id`.

## Diseño y Estilos

- Colores en `tailwind.config.js`: `mc-azul` (#1C4D8C), `mc-azul-marino` (#020659), `mc-rojo` (#D9072D), `mc-amarillo` (#F2BB16), `mc-negro` (#0D0D0D), `mc-gris` (#656565).
- Semáforo de áreas: colores definidos en `lib/areas.ts`. No los reemplace con valores hardcoded.
- Tipografía global: `League Spartan` cargada en `globals.css`.

## Variables de entorno requeridas

```
RESEND_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
GOOGLE_SHEETS_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # con \n literales — el código hace .replace(/\\n/g, '\n')
NEXT_PUBLIC_WA_NUMBER
```

---

## Mejoras futuras recomendadas

1. **Google Sheets batchUpdate:** Optimizar `/api/funnel/route.ts` para usar `spreadsheets.values.batchUpdate` en lugar de llamadas secuenciales `updateCell`. Reducirá latencia de red en móviles.
2. **Revisar visualización de PDF:** Asegurar que `components/PDFButton.tsx` dibuja los colores del semáforo unificados según `lib/areas.ts`.
3. **Persistencia fallback:** Evaluar cookies o `localStorage` temporal para prevenir pérdidas de estado en recargas móviles accidentales antes de llegar a `/datos`.
