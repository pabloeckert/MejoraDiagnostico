# Diagnóstico Empresarial — Mejora Continua

App de diagnóstico empresarial en Next.js 14. Sin base de datos, sin auth, una sola sesión.

## Instalación

```bash
npm install
npm run dev
```

## Variables de entorno

Crear `.env.local` en la raíz:

```
NEXT_PUBLIC_W3F_KEY=ea2f649b-2f8e-43ee-afdd-301e03cfedd0
```

En Vercel: Settings → Environment Variables → agregar la misma clave.

## Deploy en Vercel

```bash
git push origin main
# Vercel detecta Next.js automáticamente y deploya
```

O con CLI:

```bash
npx vercel --prod
```

## Exportar leads de localStorage

Abrí la consola del navegador en cualquier pantalla de la app y ejecutá:

```js
const leads = JSON.parse(localStorage.getItem('mc_leads') || '[]')
console.table(leads)

// Para descargar como JSON:
const a = document.createElement('a')
a.href = URL.createObjectURL(new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' }))
a.download = 'leads_mejora.json'
a.click()
```

## Estructura

```
/app
  /page.tsx              → Inicio
  /diagnostico/page.tsx  → 8 preguntas
  /datos/page.tsx        → Formulario contacto
  /resultado/page.tsx    → Resultado + PDF
  /api/send-email/       → Proxy Web3Forms
/components
  ProgressBar.tsx
  QuestionCard.tsx
  AreaBar.tsx
  PDFButton.tsx
/lib
  preguntas.ts
  areas.ts
  perfiles.ts
  detectar.ts
/hooks
  useDiagnostico.ts
```
