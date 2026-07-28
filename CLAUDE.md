# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev      # Dev server en localhost:3000
npm run build    # Build de producción
npm run lint     # ESLint
```

No hay suite de tests configurada (unit/integration). El README.md está desactualizado — no lo uses como fuente de verdad.

## Deploy a producción

Producción es **Vercel** (proyecto `mejoradiagnostico`, dominio `diagnostico.mejoraok.com`). El deploy es **automático por push a `main`** — no hay comando de deploy manual ni se usa el CLI de Vercel (no está logueado en la máquina de desarrollo). Las variables de entorno de producción viven en el dashboard de Vercel, **no** en `.env.local` (que localmente tiene las de Google en blanco).

Flujo estándar para subir un cambio:

```bash
npm run build                      # 0 errores antes de commitear; si falla, NO commitear
git add -A
git commit -m "tipo: descripcion"  # commit único por cambio lógico; convención tipo: feat/fix/test/...
git push origin main               # dispara el build+deploy en Vercel (~30s–3min)
```

Verificar que el deploy nuevo ya está live (sin acceso al dashboard) — pollear un marcador que solo exista en el commit recién subido, p. ej.:

```bash
P=https://diagnostico.mejoraok.com
curl -s -o /dev/null -w "%{http_code}\n" $P/api/admin/data   # 401 = auth nueva ya desplegada
curl -s -o /dev/null -w "%{http_code}\n" $P/robots.txt       # 200 = robots.ts ya desplegado
```

Validación end-to-end post-deploy: `npx tsx scripts/test-e2e-completo.ts` simula un diagnóstico completo **contra producción** (escribe en el Sheet real, dispara Telegram a Sindy y email vía Resend), verifica Funnel + Eventos y **limpia el Sheet al terminar**. Requiere el JSON de service account (`mejoraproyecto-*.json`, gitignored) en la raíz. Tras correrlo, confirmar Sheet vacío con `scripts/leer-ultima-fila.ts` y revisar que llegó **exactamente 1** mensaje de Telegram.

### Scripts de verificación (`scripts/`)

No son parte de `npm run`, se ejecutan manualmente con `node` (requieren `npm run dev` corriendo en `localhost:3000`):

- `node scripts/verify_e2e.mjs` — recorre el flujo completo con Playwright para varios escenarios de respuestas y compara el perfil resultante contra el esperado.
- `node scripts/verify_8perfiles.mjs` — variante que cubre los 8 perfiles, generando capturas en `scripts/screenshots/`.
- `npx tsx scripts/validar-perfiles.ts` (o equivalente) — recorre combinatoriamente las respuestas posibles y valida la distribución de perfiles contra `lib/scoring.ts` sin levantar el navegador. (`scripts/simular_combinaciones.mjs` es una variante previa y quedó desactualizada — usa nombres de perfiles antiguos que ya no existen en `lib/perfiles.ts`; no usarla como referencia.)
- `scripts/crear-sheet-funnel.ts`, `scripts/crear-sheet-eventos.ts`, `scripts/formatear-sheet-funnel.ts`, `scripts/fix-headers.ts`, `scripts/limpiar-sheets.ts`, `scripts/leer-ultima-fila.ts` — utilidades puntuales para inicializar/inspeccionar/mantener las hojas Funnel y Eventos de Google Sheets (crear pestaña, reescribir headers si el schema de columnas se corrompe, vaciar dejando headers).

`scripts/screenshots/` y `scripts/verify-prod.mjs` están en `.gitignore` (artefactos/regenerables, no commitear).

## Stack

Next.js 14.2.35 (App Router) · React 18 · TypeScript · Tailwind CSS v3 · Resend (email) · Google Sheets API (funnel) · Telegram Bot API (notificaciones) · Zod (validación server-side) · jsPDF (PDF cliente).

## Arquitectura general

App de diagnóstico empresarial de una sola pasada: el usuario responde 8 preguntas (más una 9ª opcional de posición) → ingresa sus datos → ve el resultado completo. Rutas: `/` → `/diagnostico` → `/datos` → `/resultado`. Existe también `/privacidad` (página estática) y `/gracias` (página final post-CTA).

`app/preview/page.tsx` es una herramienta interna: previsualiza cómo se ve `/resultado` para cada uno de los 8 perfiles sin completar el diagnóstico real (inyecta scores dummy en `sessionStorage` y abre `/resultado` en una pestaña nueva). Gateada por una contraseña hardcodeada en el cliente (`PREVIEW_PASSWORD`) — no es seguridad real, solo fricción para no exponerla casualmente.

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
- **`/api/funnel`**: Actualiza el embudo en Google Sheets usando `batchUpdate` (todas las celdas de un evento en una sola llamada, vía `batchUpdateCells`). Escribe en dos hojas:
  - **Funnel** (`A1:W1`, 23 columnas — schema fijado por `scripts/fix-headers.ts`): `session_id, fecha_inicio, nombre, whatsapp, perfil, paso, p1..p8, resultado_visto, abandono_en, ultimo_update, cta_click, visitor_id, origen, dispositivo, tiempos_preguntas, retomado`. Es el estado agregado por sesión (una fila por `session_id`, se actualiza in-place).
  - **Eventos** (`A1:E1`): `timestamp, visitor_id, session_id, evento, detalle` — log granular, una fila por evento (más fino que el estado agregado de Funnel).

Las cuatro APIs públicas (`funnel`, `notify`, `send-email`, `save-completion`) están protegidas con rate limiting por IP (`lib/rate-limit.ts`, in-memory best-effort): `funnel` 60/min (una sesión legítima dispara ~13 eventos), el resto 6/min por disparar email/Telegram.

### APIs y seguridad del admin

- **`/api/admin/login`**: `POST` valida la contraseña server-side (comparación en tiempo constante) y emite una cookie httpOnly firmada con HMAC-SHA256 (`lib/admin-auth.ts`). `GET` informa si la cookie es válida (lo usa `/admin` al montar). `DELETE` cierra sesión. Rate limit 8/min.
- **`/api/admin/data`** y **`/api/admin/delete-sessions`**: exigen `sesionValida(req)` (cookie del login) → `401` si falta. Antes eran públicas — nunca reintroducir esa exposición.
- `app/admin/page.tsx` ya **no** compara la contraseña en el cliente; delega en `/api/admin/login`. `app/admin/layout.tsx` marca la sección `noindex`.

El dashboard (`components/admin/Dashboard.tsx`) tiene 3 tabs (General / Detalle / Exportación), pollea `/api/admin/data` cada 20s, tiene un modo demo (datos ficticios de `lib/admin-demo-data.ts`) y un tour guiado que se muestra la primera vez (`localStorage` `mc_admin_tour_visto`). Componentes asociados: `StatsCards`, `FunnelBarChart`, `ProfilePieChart`, `SessionsTable`, `SessionDetailModal`, `ExportPanel`, `TourGuiado`, `PDFTemplateResultado`, `InfografiaGeneral`.

- **`lib/admin.ts`**: tipos `SessionRow`/`EventoRow` (espejan las columnas de las hojas Funnel/Eventos) y helpers de agregación: `calcularEstado` (`completado | en_curso | retomado | abandonado`), `esCompletada`, `filtrarSesionesPorRango`/`filtrarEventosPorRango` (`hoy | 7dias | todo`), `contarEtapas`, `distribucionPerfiles`, `tiempoPromedioSesion`.
- **`lib/admin-colors.ts`**: paleta de colores exclusiva para los gráficos del admin (`PALETA_GRAFICOS`). No deriva de `tailwind.config.js` — mantenerla en sync a mano si cambia la marca.
- **`lib/admin-demo-data.ts`**: dataset ficticio para el modo demo del dashboard. No representa leads reales.
- **`lib/admin-pdf.ts`**: genera el PDF individual por sesión y la infografía general descargable — renderiza componentes React off-screen y los captura con `html2canvas` + `jsPDF` (contenedor de tamaño cero + `overflow: hidden` para evitar que `html2canvas` calcule un canvas descomunal).

### `lib/funnel.ts`

Cliente de tracking. `trackFunnel(evento, datos?)` envía fire-and-forget a `/api/funnel`. `getSessionId()` genera un `sessionId` (`crypto.randomUUID()`) persistido en `sessionStorage` bajo `mc_session_id`. `getVisitorId()` genera/persiste un `visitor_id` en `localStorage` (`mc_visitor_id`) para identificar al visitante entre sesiones distintas. `getContextoLanding()` lee `referrer`, `utm_source`, `utm_campaign` y si el user agent es mobile/desktop, usado para poblar `origen`/`dispositivo` en la hoja Funnel.

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
ADMIN_PASSWORD                       # contraseña del panel /admin (fallback server-side: 'AdminMC')
ADMIN_SESSION_SECRET                 # secreto para firmar la cookie de sesión admin (opcional; deriva de ADMIN_PASSWORD si falta)
```

---

## Mejoras futuras recomendadas

1. **Rate limiting con store externo:** El actual (`lib/rate-limit.ts`) es in-memory y no comparte estado entre instancias serverless de Vercel. Para un límite estricto global, migrar a Upstash/Redis.
2. **Persistencia fallback:** Evaluar cookies o `localStorage` temporal para prevenir pérdidas de estado en recargas móviles accidentales antes de llegar a `/datos`.
