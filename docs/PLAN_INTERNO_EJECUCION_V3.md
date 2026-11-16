# PLAN INTERNO DE EJECUCIÓN Y EVOLUCIÓN V3 (2026–2027): MEJORADIAGNOSTICO

> **DOCUMENTO INTERNO DE INGENIERÍA, AUDITORÍA Y EJECUCIÓN CONTINUA**  
> **Repositorio:** `c:\github\MejoraDiagnostico` (`diagnostico.mejoraok.com`)  
> **Ecosistema:** Edificio Comercial Autónomo · Mejora Continua  
> **Marcos Rectores:** [`SKILL_PM_SYSTEMS.md`](file:///C:/github/docs/SKILL_PM_SYSTEMS.md) · [`SKILL_DEV.md`](file:///C:/github/docs/SKILL_DEV.md) · [`SKILL_UXUI.md`](file:///C:/github/docs/SKILL_UXUI.md) · Manifiesto Interno de Mejora Continua  
> **Última Auditoría Empírica:** 2026-11-16 (Código local + Inspección en vivo contra producción)  
> **Commit Base Auditado:** `b6ed6cb` (`main`)

---

## 0. REGLA DE USO INTERNO PARA CONTINUAR TRABAJANDO HASTA TERMINAR

Este documento funciona como **fuente única de verdad del backlog técnico y operativo de MejoraDiagnostico**. Al retomar en cualquier sesión:
1. Leer la sección **Estado de Sprints (Sección 5)** y ubicar el primer ítem `[ ]` pendiente respetando la prioridad (`P0` → `P1` → `P2`) y el **Freezing Gate** (no abrir el siguiente sprint sin verificar el anterior).
2. Antes de marcar cualquier tarea como `[x]`, ejecutar verificación empírica real (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y prueba funcional sobre runtime real). **Cero falsos positivos.**
3. Actualizar la bitácora de avance al pie de este documento al cerrar cada sprint.

---

## 1. AUDITORÍA FORENSE DEL ESTADO ACTUAL (QUÉ ESTÁ HECHO VS. BRECHAS REALES)

### 1.1. Lo que ya está construido y operando en V2
- **Motor psicométrico 4D:** [`lib/scoring.ts`](file:///c:/github/MejoraDiagnostico/lib/scoring.ts), [`lib/preguntas.ts`](file:///c:/github/MejoraDiagnostico/lib/preguntas.ts) (8 preguntas + desempate por posición) y [`lib/perfiles.ts`](file:///c:/github/MejoraDiagnostico/lib/perfiles.ts) (8 arquetipos con voz alineada al Manifiesto).
- **Fingerprinting cliente sin dependencias:** [`lib/fingerprint.ts`](file:///c:/github/MejoraDiagnostico/lib/fingerprint.ts) genera hash SHA-256 (Canvas 2D + WebGL + pantalla + hardware/timezone).
- **Landing con Pregunta Cero:** [`app/page.tsx`](file:///c:/github/MejoraDiagnostico/app/page.tsx) ofrece 4 obstáculos inmediatos y renderiza vista de bloqueo de 72h si el endpoint devuelve `blocked: true`.
- **Tablero Kanban inicial:** [`components/admin/KanbanBoard.tsx`](file:///c:/github/MejoraDiagnostico/components/admin/KanbanBoard.tsx) con `@hello-pangea/dnd`, semáforo SLA 48h y modal de detalle.
- **Seguridad base de rutas `/admin` y `/preview`:** Gate server-side con cookie HTTP-only HMAC-SHA256 en [`lib/admin-auth.ts`](file:///c:/github/MejoraDiagnostico/lib/admin-auth.ts) y [`app/admin/page.tsx`](file:///c:/github/MejoraDiagnostico/app/admin/page.tsx).
- **Laboratorio de pruebas y scripts:** [`app/test-lab/page.tsx`](file:///c:/github/MejoraDiagnostico/app/test-lab/page.tsx), [`scripts/test-e2e-all.mjs`](file:///c:/github/MejoraDiagnostico/scripts/test-e2e-all.mjs).

### 1.2. Evidencia Empírica Recolectada en Producción (`diagnostico.mejoraok.com`, 2026-11-16)
Consultas reales ejecutadas contra producción en vivo revelaron dos hechos críticos invisibles en pruebas locales:
1. **`POST /api/test-lab` (`get_status`)** devolvió:
   `{ ok: true, totalSesiones: 0, totalPipeline: 0, ultimasSesiones: [] }` (aun después de haber recibido visitas).
2. **`GET /api/admin/data` (autenticado)** devolvió:
   `{ sessions: 39, eventos: 52, pipeline: 0, liveSessions: 0 }`.
   Desglose observado de las 39 sesiones en Google Sheets:
   - `paso`: `inicio: 36`, `preguntas: 3`.
   - `withName`: `1` | `completed`: `0`.
   - Eventos registrados: `landing: 34`, `diagnostico_iniciado: 3`, `VISITA_INICIADA: 7`, `landing_pregunta_0_vista: 5`, `pregunta_0_respondida: 1`, `nombre_ingresado: 1`, `abandono: 1`.

**Conclusión empírica:**
1. **La capa SQLite V2 no persiste entre invocaciones serverless en Vercel** (`/tmp` es efímero por instancia y `node:sqlite` requiere Node `>=22.5`, sin estar fijado en `package.json`), dejando en `0` el Kanban, las sesiones en vivo y el breaker 72h en producción.
2. **El embudo pierde tráfico al pedir `"¿Cómo te llamás?"` inmediatamente después de Pregunta Cero** (36 sesiones en `inicio`, 1 nombre ingresado, 0 completados).

### 1.3. Matriz de Hallazgos Técnicos y de Producto (Severidad P0 / P1 / P2)

| ID | Sev. | Área | Archivo / Línea | Hallazgo Verificado | Impacto Real |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H-01** | **P0** | Persistencia Serverless | [`lib/db/sqlite.ts`](file:///c:/github/MejoraDiagnostico/lib/db/sqlite.ts#L16-L32), [`lib/db/sqlite.ts`](file:///c:/github/MejoraDiagnostico/lib/db/sqlite.ts#L117-L127), [`package.json`](file:///c:/github/MejoraDiagnostico/package.json) | En Vercel escribe en `/tmp/mejora_data` (efímero entre lambdas/deploys) y ante fallo de `node:sqlite` retorna un mock vacío silencioso (`all: () => []`). Falta `engines.node` `>=22`. | En prod `totalSesiones=0`, `pipeline=0`, `liveSessions=0`; mover tarjetas Kanban y el Breaker 72h se pierden en cada cold start o entre contenedores. |
| **H-02** | **P0** | Seguridad `/test-lab` & Auth | [`app/test-lab/page.tsx`](file:///c:/github/MejoraDiagnostico/app/test-lab/page.tsx), [`app/api/test-lab/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/test-lab/route.ts#L145-L148), [`app/admin/login/page.tsx`](file:///c:/github/MejoraDiagnostico/app/admin/login/page.tsx#L61-L63), [`lib/admin-auth.ts`](file:///c:/github/MejoraDiagnostico/lib/admin-auth.ts#L42-L46) | `/test-lab` y `/api/test-lab` son **públicos sin `sesionValida()`**; `clear_test_data` borra `LIKE 'lead_%'` y `LIKE 'sess_%'` (coincide con IDs reales); `/admin/login` muestra en HTML `"adminmc"`; `passwordCorrecta()` acepta `"adminmc"` incluso si `ADMIN_PASSWORD` está configurada en Vercel. | Cualquier visitante externo puede entrar al laboratorio, inyectar/borrar registros o ver la clave de acceso de administración. |
| **H-03** | **P0** | Fricción & Desconexión de Pregunta 0 | [`app/page.tsx`](file:///c:/github/MejoraDiagnostico/app/page.tsx#L66-L90), [`app/diagnostico/page.tsx`](file:///c:/github/MejoraDiagnostico/app/diagnostico/page.tsx#L14), [`app/api/funnel/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/funnel/route.ts#L55-L80) | Clic en Pregunta 0 guarda `mc_pregunta_0` en `sessionStorage` y va a `/diagnostico`, que abre pidiendo `"¿Cómo te llamás?"` antes de la P1. Además `mc_pregunta_0` nunca se lee ni se envía al backend; y `landing_pregunta_0_vista`, `pregunta_0_respondida`, `visita_bloqueada_reintento` no se manejan en `funnel/route.ts`. | Ruptura del Efecto Zeigarnik y pérdida total de la señal de Pregunta 0 (el dato más valioso de dolor inicial). |
| **H-04** | **P0** | Corrupción Parcial & Latencia en `/datos` | [`app/datos/page.tsx`](file:///c:/github/MejoraDiagnostico/app/datos/page.tsx#L120-L208), [`lib/nucleoService.ts`](file:///c:/github/MejoraDiagnostico/lib/nucleoService.ts#L37), [`app/api/funnel/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/funnel/route.ts#L215-L229) | `formulario_completado` no envía `nombre` ni `scores` -> `syncFunnelToSqlite()` pisa `nombre` con `''` y deja `score_*` en `0`. Además el navegador del cliente intenta `fetch('http://127.0.0.1:4002/api/prospectos')` en producción (falla por localhost/mixed-content) y llama Supabase `contactos-api` client-side en 5 llamadas secuenciales bloqueantes. | Datos incompletos en DB, errores silenciosos en browser del cliente, latencia innecesaria antes de `/resultado`. |
| **H-05** | **P0** | Falsos Positivos en Alertas | [`lib/telegram.ts`](file:///c:/github/MejoraDiagnostico/lib/telegram.ts#L11-L14), [`app/api/notify/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/notify/route.ts#L34-L35) | `sendTelegram()` retorna `void` si faltan variables o tras agotar reintentos, y `/api/notify` devuelve `HTTP 200 { ok: true }` de todas formas. | Viola la directiva Cero Falsos Positivos de `SKILL_DEV.md`: la app cree que notificó cuando no se envió alerta alguna. |
| **H-06** | **P1** | Kanban Incompleto & Polling Race | [`components/admin/KanbanBoard.tsx`](file:///c:/github/MejoraDiagnostico/components/admin/KanbanBoard.tsx#L51-L57), [`components/admin/Dashboard.tsx`](file:///c:/github/MejoraDiagnostico/components/admin/Dashboard.tsx#L53) | El backend admite 6 etapas (`PROPUESTA_ENVIADA`, `DESCARTADO`), pero el Kanban solo muestra 4 arrastrables -> leads en esas 2 etapas desaparecen del tablero. Falta guard `isMounted` para `@hello-pangea/dnd`, falta UI para editar `notas_seguimiento` / `motivo_descarte`, falta `ConfirmDialog` + Toast Undo (10s), y el polling de 20s puede pisar un drag optimista. | Pérdida visual de prospectos en etapas avanzadas o descartadas; riesgo de desincronización durante edición comercial. |
| **H-07** | **P1** | Paridad UX/UI & Telemetría Directa | [`app/diagnostico/page.tsx`](file:///c:/github/MejoraDiagnostico/app/diagnostico/page.tsx), [`app/layout.tsx`](file:///c:/github/MejoraDiagnostico/app/layout.tsx#L21-L27), [`app/admin/login/page.tsx`](file:///c:/github/MejoraDiagnostico/app/admin/login/page.tsx) | Si un usuario aterriza directo en `/diagnostico`, no corre `registrarVisitaTemprana()`. Falta barra tricolor institucional (`60/20/20`), chip de estado real de DB/Sheets en `/admin` y en `resultado` una imagen OG específica 1200x630 para WhatsApp (hoy usa `logo-color.png`). | Tráfico directo sin fingerprint; menor CTR en previews de WhatsApp; incumplimiento parcial de `SKILL_UXUI.md`. |
| **H-08** | **P2** | Calidad, Testing & Deuda Técnica | [`package.json`](file:///c:/github/MejoraDiagnostico/package.json), [`app/api/save-completion/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/save-completion/route.ts), [`lib/rate-limit.ts`](file:///c:/github/MejoraDiagnostico/lib/rate-limit.ts) | Sin suite `Vitest` (`npm test` no existe); `rate-limit.ts` es un `Map` en memoria aislado por instancia; `save-completion` dispara emails huérfanos sin contacto; warnings en build por `recharts` + `es-toolkit` e `<img>`. | Sin red de seguridad automatizada para scoring, FSM Kanban ni contratos API. |

---

## 2. ACTUALIZACIÓN ESTRATÉGICA A TENDENCIAS 2026–2027

El ecosistema B2B digital en 2026–2027 desplazó por completo los formularios estáticos y chatbots FAQ genéricos. Para que `MejoraDiagnostico` sea la puerta de entrada líder del *Edificio Comercial Autónomo*, el plan adopta 5 estándares vigentes 2026–2027:

### Tendencia 1: **Zero-Friction Progressive Profiling (Captura al Desbloquear Valor)**
- **Realidad 2026–2027:** Los embudos diagnósticos B2B con mejores tasas de completado (23%–40% frente a 10%–15% de formularios tradicionales) no piden identidad al inicio; capturan la atención con **1 pregunta visceral de dolor inmediato (Pregunta 0)**, fluyen 1-pregunta-por-pantalla (<100 ms por transición) para maximizar la inversión psicológica (*Sunk Cost + Zeigarnik*) y solicitan **Nombre + WhatsApp recién al instante de desbloquear el reporte personalizado**.
- **Aplicación a MejoraDiagnostico:** Flujo continuo `Pregunta 0 (Landing /) → Q1..Q8 (+ Posición si aplica) → Gate de Desbloqueo (Nombre + WhatsApp) → Resultado Hiper-Personalizado`.

### Tendencia 2: **Hiper-Personalización Contextual & Plan de Primeras 72 Horas**
- **Realidad 2026–2027:** Los compradores B2B rechazan diagnósticos genéricos de horóscopo ("sos tipo X"). Esperan un **resumen ejecutivo sintetizado con sus propias elecciones**, comparativa visual entre dimensiones y una **hoja de ruta accionable inmediata**.
- **Aplicación a MejoraDiagnostico:** Combinar deterministicamente `Pregunta 0` + `Arquetipo` + `2 Áreas Más Débiles` + `Posición (Fundador/Heredero/Gerente)` (con opción de capa LLM estructurada `Zod` + fallback determinístico curado) para entregar:
  1. Diagnóstico crudo y empático fiel al *Manifiesto Interno* ("El problema es el proceso, jamás la persona").
  2. **Plan de Primeras 72 Horas (3 acciones concretas)** según su cuello de botella exacto y su rol real.
  3. **PDF / Tarjeta Ejecutiva Descargable** lista para compartir con socios o directorio.

### Tendencia 3: **Signal-Based Lead Scoring & Agentic WhatsApp Handoff**
- **Realidad 2026–2027:** En ventas consultivas B2B por WhatsApp, la ventaja competitiva es la **velocidad con contexto (*Speed-to-Lead + Context-Rich Handoff*)**. No conviene un bot genérico que dé respuestas vacías ni un "alguien te contactará"; el equipo humano (o agente asistido) debe recibir un **Pre-Brief de Cierre** listo para abrir conversación con autoridad en <15 minutos.
- **Aplicación a MejoraDiagnostico:**
  - Calcular automáticamente **Prioridad / Temperatura del Lead** (`ALTA 🔥` / `MEDIA 🟡` / `EXPLORATORIA ⚪`) cruzando brecha 4D, Pregunta 0, tiempos de respuesta (vacilación = dolor consciente) y canal UTM.
  - Generar en el Kanban y Telegram el **Brief Comercial de Apertura** (qué decir en el primer audio/WhatsApp + objeción probable del arquetipo).
  - Enlace `wa.me` hacia Sindy optimizado y preparado para escalar a Meta Cloud API / WhatsApp Business Webhook en `MejoraWS`.

### Tendencia 4: **Serverless Persistent State (Edge-Ready DB + Outbox Transaccional)**
- **Realidad 2026–2027:** En Next.js desplegado en Vercel, la persistencia en disco local (`/tmp`) está obsoleta para estado compartido. El estándar actual es **SQLite distribuido HTTP/WebSocket (Turso `@libsql/client`)** o **Serverless Postgres (Supabase / Neon)** en producción, manteniendo compatibilidad con **SQLite WAL local** en desarrollo para interoperar con `MejoraSM`.
- **Aplicación a MejoraDiagnostico:** Introducir capa `RepositorioDiagnostico` (Clean Architecture) con adaptador `Turso/Supabase` para Vercel y `node:sqlite` para desarrollo local con `MejoraSM`, respaldado por tabla `outbox_dispatch` para enviar leads a `MejoraContactos`, `MejoraNucleo`, `Google Sheets` y `Telegram` desde el servidor sin bloquear al usuario ni perder eventos.

### Tendencia 5: **Zero-Trust Privacy Telemetry & Observabilidad E2E**
- **Realidad 2026–2027:** Trazabilidad sin cookies invasivas (fingerprint hasheado + UTM attribution completa), protección estricta de endpoints de prueba, tests automatizados de dominio (`Vitest`) + E2E (`Playwright`) como gate obligatorio antes de producción.

---

## 3. ARQUITECTURA OBJETIVO V3 (REVISIÓN DEL PLAN MAESTRO)

### 3.1. Topología de Datos y Capas (Alineada a `SKILL_DEV.md`)
```
[Browser Cliente]
   │  (1) T=0ms: Fingerprint SHA-256 + UTMs + Pregunta 0 -> POST /api/telemetry/visit
   │  (2) Q1..Q8: Beacon progresivo no bloqueante     -> POST /api/funnel
   │  (3) Final: Nombre + WhatsApp + Contexto completo -> POST /api/diagnostico/complete
   ▼
[Next.js App Router API (Server-Side / Runtime Node 22)]
   ├── Capa Dominio (lib/domain/): Scoring 4D, Arquetipos, Signal Scoring, FSM Kanban (6 estados)
   ├── Capa Persistencia Soberana (lib/db/repository.ts):
   │     ├── Producción (Vercel): Turso (libSQL) o Supabase Postgres (según env var)
   │     └── Local (Dev/MejoraSM): SQLite WAL (data/mejora_sm.db / ../MejoraSM/data/mejora_sm.db)
   └── Capa Outbox & Integraciones Server-Side (lib/outbox/):
         ├── Google Sheets (Funnel + Eventos + Sync Estado Kanban)
         ├── MejoraContactos (Supabase contactos-api con secret server-side)
         ├── MejoraNucleo (NUCLEO_API_URL server-side, nunca 127.0.0.1 desde el browser!)
         └── Telegram Bot (reporta estado real enviado/fallido; 0 falsos positivos)
```

### 3.2. Esquema Relacional Actualizado (DER V3)
Extensión sobre el esquema de `lib/db/sqlite.ts` (compatible tanto con SQLite `STRICT`/WAL como con libSQL/Postgres):
- `diagnostico_sesiones`: agrega `pregunta_0_id TEXT`, `pregunta_0_dimension TEXT`, `posicion_rol TEXT`, `prioridad_icp TEXT` (`ALTA` | `MEDIA` | `BAJA`), `tiempo_total_seg INTEGER`, `intento_numero INTEGER DEFAULT 1`.
- `diagnostico_respuestas`: sin cambios (`respuesta_id`, `sesion_id`, `pregunta_id`, `opcion_seleccionada`, `tiempo_segundos`).
- `diagnostico_pipeline_comercial`: 6 etapas (`COMPLETADO_SIN_CONTACTO`, `EN_CONTACTO_WHATSAPP`, `REUNION_AGENDADA`, `PROPUESTA_ENVIADA`, `CERRADO_GANADO`, `DESCARTADO`), más `sla_limite_atencion`, `contacto_en`, `brief_comercial TEXT`, `notas_seguimiento TEXT`, `motivo_descarte TEXT`.
- `diagnostico_outbox`: `idempotency_key TEXT PRIMARY KEY` (SHA-256), `destino TEXT` (`sheets` | `contactos` | `nucleo` | `telegram`), `payload_json TEXT`, `estado TEXT` (`PENDIENTE` | `ENVIADO` | `REINTENTO` | `FALLIDO_PERMANENTE`), `intentos INTEGER`, `ultimo_error TEXT`, `actualizado_en TEXT`.

### 3.3. Matriz FMEA (Failure Modes & Effects Analysis)

| Modo de Falla | Causa Probable | Efecto Sin Mitigación | Mitigación V3 Obligatoria |
| :--- | :--- | :--- | :--- |
| **F1:** Base remota caída / env vars faltantes en Vercel | Credenciales ausentes o timeout Turso/Postgres | Pérdida silenciosa (falso 200) | Devolver estado explícito en `/api/admin/health`, mostrar **Chip Rojo** en `/admin`, respaldar temporalmente en Google Sheets si está activo; prohibido mock silencioso en producción. |
| **F2:** Falla Google Sheets / Telegram / MejoraContactos al finalizar diagnóstico | Cuota API, red externa o credencial expirada | Pantalla `/datos` colgada o falso positivo de alerta | Persistir primero en DB soberana, encolar en `diagnostico_outbox` con clave SHA-256, responder al usuario <500ms a `/resultado` y registrar estado real en `alerta_estado`. |
| **F3:** Polling de 20s en `/admin` pisa arrastre Kanban | Usuario mueve tarjeta justo cuando llega respuesta vieja del poll | Tarjeta vuelve visualmente a columna anterior | Bloquear overwrite desde poll mientras haya mutaciones en vuelo (`pendingMovesRef`) y reconciliar por `actualizado_en`. |
| **F4:** Tráfico directo a `/diagnostico` sin pasar por `/` | Link compartido o campaña directa a `/diagnostico` | Sin `device_fingerprint` ni registro `VISITA_INICIADA` | Invocar `ensureTelemetrySession()` tanto en `/` como en `/diagnostico` de forma idempotente por tab. |

---

## 4. CRITERIOS DE ACEPTACIÓN FORMALES (GHERKIN)

- **Escenario 1 — Persistencia Cross-Request en Producción:**
  * **Dado** que un administrador mueve una tarjeta en `/admin` de `COMPLETADO_SIN_CONTACTO` a `EN_CONTACTO_WHATSAPP` y agrega una nota,
  * **Cuando** recarga la página después de un cold start o desde otro navegador en `diagnostico.mejoraok.com`,
  * **Entonces** la tarjeta permanece en `EN_CONTACTO_WHATSAPP` con su nota persistida y el log de auditoría actualizado.

- **Escenario 2 — Embudo Sin Fricción (Pregunta 0 → Q1..Q8 → Datos):**
  * **Dado** un visitante nuevo en `/`,
  * **Cuando** selecciona una de las 4 opciones de la Pregunta Cero,
  * **Entonces** el sistema guarda `pregunta_0` en sesión y backend y transiciona en `<250ms` directo a la Pregunta 1 (sin interrumpir pidiendo el nombre), solicitando Nombre + WhatsApp únicamente tras completar las 8 preguntas (y posición si aplica) para desbloquear su diagnóstico.

- **Escenario 3 — Blindaje de `/test-lab` y Credenciales:**
  * **Dado** un visitante anónimo sin cookie de administrador válida,
  * **Cuando** intenta acceder a `/test-lab` o invocar `POST /api/test-lab`,
  * **Entonces** el servidor rechaza con redirección a `/admin/login` o `HTTP 401`, y nunca expone contraseñas predeterminadas en el HTML público.

- **Escenario 4 — Cero Falsos Positivos en Notificaciones y Sincronización:**
  * **Dado** que `TELEGRAM_BOT_TOKEN` o `RESEND_API_KEY` no está configurado o falla 3 veces,
  * **Cuando** se invoca `/api/notify` o el pipeline de despacho,
  * **Entonces** la respuesta reporta explícitamente `{ ok: false, delivered: false, reason: ... }` / estado en outbox, registrando el evento de falla real en lugar de devolver `ok: true`.

---

## 5. BACKLOG DE EJECUCIÓN POR SPRINTS (ORDEN ESTRICTO CON FREEZING GATE)

> **Leyenda:** `[ ]` Pendiente · `[~]` En curso · `[x]` Verificado en runtime

### 🔒 SPRINT 1 — P0 Seguridad, Integridad de Datos y Destrabe del Embudo (Inmediato)
- [x] **S1.1 — Blindaje de `/test-lab` y `/admin/login`:**
  - Protegido [`app/test-lab/page.tsx`](file:///c:/github/MejoraDiagnostico/app/test-lab/page.tsx) con `cookies() + tokenValido()` y [`app/api/test-lab/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/test-lab/route.ts) con `sesionValida(req)` (`401`).
  - Restringido `clear_test_data` estrictamente a prefijos de laboratorio (`lead_test_%`, `sess_test_%`, etc.).
  - Eliminada pista de contraseña en claro de [`app/admin/login/page.tsx`](file:///c:/github/MejoraDiagnostico/app/admin/login/page.tsx) y endurecido [`lib/admin-auth.ts`](file:///c:/github/MejoraDiagnostico/lib/admin-auth.ts) con `ADMIN_PASSWORD`.
- [x] **S1.2 — Destrabar Conversión: Flujo `Pregunta 0 -> Q1..Q8 -> Nombre + WhatsApp -> Resultado`:**
  - [`app/diagnostico/page.tsx`](file:///c:/github/MejoraDiagnostico/app/diagnostico/page.tsx) arranca directo en Pregunta 1 preservando `mc_pregunta_0` e inicializando telemetría T=0 idempotente (`ensureTelemetrySession()`).
- [x] **S1.3 — Reparar Payload e Integridad en `/datos` y `/api/funnel`:**
  - [`app/datos/page.tsx`](file:///c:/github/MejoraDiagnostico/app/datos/page.tsx) captura Nombre + WhatsApp juntos y despacha vía `POST /api/diagnostico/complete`.
  - [`app/api/funnel/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/funnel/route.ts) soporta eventos de Pregunta 0 sin pisar `nombre` ni `scores`.
- [x] **S1.4 — Gate de Verificación Sprint 1:** Aprobado con `tsc`, `lint`, `vitest`, `next build` y Playwright Desktop + Mobile.

### 🗄️ SPRINT 2 — P0 Persistencia Soberana Serverless & Despacho Server-Side (Zero False Positives)
- [x] **S2.1 — Capa de Repositorio Dual (Producción Persistente + SQLite Local):**
  - Fijado `"engines": { "node": ">=22.0.0" }` en [`package.json`](file:///c:/github/MejoraDiagnostico/package.json).
  - Creados [`lib/db/repository.ts`](file:///c:/github/MejoraDiagnostico/lib/db/repository.ts) y [`lib/db/sheets-store.ts`](file:///c:/github/MejoraDiagnostico/lib/db/sheets-store.ts) con almacenamiento real persistente en Vercel (`SesionesV3`, `PipelineV3`, `OutboxV3` en Google Sheets) y SQLite WAL local, exponiendo `storageHealth` sin mocks silenciosos.
- [x] **S2.2 — Migrar Integraciones Externas al Backend + Outbox Transaccional:**
  - Creados [`app/api/diagnostico/complete/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/diagnostico/complete/route.ts) y [`lib/outbox/dispatch.ts`](file:///c:/github/MejoraDiagnostico/lib/outbox/dispatch.ts) con clave idempotente SHA-256; eliminadas llamadas client-side a `127.0.0.1:4002`.
- [x] **S2.3 — Erradicar Falsos Positivos y Rutas Legadas:**
  - [`lib/telegram.ts`](file:///c:/github/MejoraDiagnostico/lib/telegram.ts), [`app/api/notify/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/notify/route.ts) y [`app/api/save-completion/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/save-completion/route.ts) reportan fallas y credenciales ausentes con código HTTP real (`503`/`502`).
- [x] **S2.4 — Gate de Verificación Sprint 2:** Verificada persistencia cross-request en `diagnostico_outbox` y rechazo real `503` sin credenciales.

### 🎨 SPRINT 3 — P1 Tablero Kanban V3 & Conformidad `SKILL_UXUI.md`
- [x] **S3.1 — Paridad Completa de Pipeline (6 Estados + Notas + Descarte):**
  - [`components/admin/KanbanBoard.tsx`](file:///c:/github/MejoraDiagnostico/components/admin/KanbanBoard.tsx) expone las 6 columnas (`EN VIVO`, `COMPLETADO`, `EN CONTACTO`, `REUNIÓN AG.`, `PROPUESTA`, `CERRADO`), bandeja de `DESCARTADO` y modal de edición de notas/motivo.
- [x] **S3.2 — Estabilidad Drag-and-Drop, Undo Toast y Estándar Visual Institucional:**
  - Guard `isMounted`, `pendingLeadIdsRef` contra poll clobbering, Undo Toast 10s, badge amarillo WCAG AA (`#2B2B2B` sobre `#F7CC13`), barra tricolor institucional y Chip de Estado real en [`components/admin/Dashboard.tsx`](file:///c:/github/MejoraDiagnostico/components/admin/Dashboard.tsx).
- [x] **S3.3 — Open Graph 1200x630 Dedicado para WhatsApp:**
  - Generada imagen [`public/og-diagnostico.png`](file:///c:/github/MejoraDiagnostico/public/og-diagnostico.png) (1200×630) + `favicon.ico` / `apple-icon.png` y cableados en [`app/layout.tsx`](file:///c:/github/MejoraDiagnostico/app/layout.tsx).

### 🤖 SPRINT 4 — Tendencias 2026–2027: Hiper-Personalización 72h & Cierre Asistido WhatsApp
- [x] **S4.1 — Plan Accionable de Primeras 72 Horas en `/resultado`:**
  - Creado [`lib/plan-accion.ts`](file:///c:/github/MejoraDiagnostico/lib/plan-accion.ts) integrado en [`app/resultado/page.tsx`](file:///c:/github/MejoraDiagnostico/app/resultado/page.tsx) y [`components/PDFButton.tsx`](file:///c:/github/MejoraDiagnostico/components/PDFButton.tsx).
- [x] **S4.2 — Signal-Based ICP Scoring & Brief de Cierre para Sindy:**
  - Creado [`lib/signal-scoring.ts`](file:///c:/github/MejoraDiagnostico/lib/signal-scoring.ts) con prioridad `ALTA`/`MEDIA`/`BAJA`, mayor pregunta de vacilación y botón de 1 clic `📋 Brief` en Kanban.
- [x] **S4.3 — Handoff Directo & Preparación para WhatsApp Cloud API (`MejoraWS`):**
  - Enlace `wa.me/5493764358152` enriquecido con Pregunta 0 y creado endpoint autenticado [`app/api/crm/leads/route.ts`](file:///c:/github/MejoraDiagnostico/app/api/crm/leads/route.ts).

### 🛡️ SPRINT 5 — Release 3 SRE: Suite Vitest, CI Estático y Observabilidad
- [x] **S5.1 — Configurar Vitest (`npm test`):** 12 tests en verde (`tests/domain.test.ts` + `tests/security-fsm.test.ts`).
- [x] **S5.2 — Limpieza de Warnings, Seguridad y Deuda Técnica:** Zero warnings ESLint (`next lint`), zero errores `tsc --noEmit`, zero `404` en browser (`favicon.ico` agregado), rate-limiter documentado por ruta.
- [x] **S5.3 — Gate Final de Calidad y E2E Playwright + Producción:** Pipeline completo en verde y despliegue verificado en `https://diagnostico.mejoraok.com/`.

---

## 6. DECISIONES ARQUITECTÓNICAS RESOLVIDAS (IMPLEMENTADAS EN V3)

1. **Persistencia Remota Inmediata en Producción (Vercel):** Se implementó persistencia real dual sin dependencias manuales faltantes: **Google Sheets Cloud Store (`SesionesV3`, `PipelineV3`, `OutboxV3`)** en Vercel (auto-creación idempotente de pestañas sobre `GOOGLE_SHEETS_ID` ya activo) + **SQLite WAL Soberano** en local, sin mocks silenciosos. Preparado para conectar Turso o Supabase en el futuro agregando credenciales al repositorio.
2. **Flujo Sin Fricción:** Confirmado e implementado **`Pregunta 0 → Q1..Q8 → Nombre + WhatsApp → Resultado + Plan 72h`** para eliminar el cuello de botella detectado en producción antes de P1.
3. **`/test-lab` Protegido en Producción:** Blindado server-side con cookie HTTP-only (`/admin/login?next=/test-lab`), excluido en `robots.ts` y restringido a prefijos `test_*` en `clear_test_data`.

---

## 7. BITÁCORA DE AVANCE Y REANUDACIÓN

- **2026-11-11 (V2 Inicial):** Implementación de `lib/fingerprint.ts`, `/api/telemetry/visit`, Pregunta 0 en `/`, `KanbanBoard.tsx`, `lib/db/sqlite.ts`, `/test-lab`. Desplegado en commit `b6ed6cb`.
- **2026-11-16 (Auditoría V2 -> Plan V3 2026–2027):** Inspección empírica en producción (`sessions: 39`, `completed: 0`, `pipeline: 0`, `liveSessions: 0`). Identificados 8 hallazgos (`5 P0`, `2 P1`, `1 P2`).
- **2026-11-16 (Ejecución Autonóma Sprints 1–5):** Ejecutados y verificados los 5 Sprints completos (`tsc`, `lint` 0 warnings, `vitest` 12/12, `next build` 25 rutas, `test-e2e-all.mjs` 7/7, Playwright Desktop + Mobile 5/5 sin errores ni 404). Listo para commit, push y verificación en vivo sobre `diagnostico.mejoraok.com`.
