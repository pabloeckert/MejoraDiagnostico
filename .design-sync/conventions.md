## Styling idiom

This DS styles exclusively with **Tailwind utility classes** — no CSS-in-JS,
no `var(--token)` custom properties, no styled-components. Brand colors are
registered as named Tailwind colors (see `_ds_bundle.css` / `styles.css`),
not raw hex in className. Use these classes directly, never substitute a
generic Tailwind color (`bg-blue-600`, `text-red-500`, etc.) for them:

| Class family | Hex | Use |
|---|---|---|
| `mc-azul` | `#1C4D8C` | primary actions, links, progress fill |
| `mc-azul-marino` | `#020659` | dark panels/backgrounds (e.g. the left rail) |
| `mc-rojo` | `#D9072D` | brand red accent |
| `mc-amarillo` | `#F2BB16` | highlight/accent text on dark backgrounds |
| `mc-negro` | `#0D0D0D` | primary text |
| `mc-gris` | `#656565` | secondary/muted text |
| `mc-gris-claro` | `#F2F2F2` | light track/background fill |

Apply as `bg-mc-azul`, `text-mc-gris`, `border-mc-azul`, etc. — standard
Tailwind color-utility suffixing.

## Status semaphore — not a Tailwind class

Score/status colors (used by `AreaBar`, `GaugeArea`, `GaugeGlobal`) are a
**separate three-tier system**, applied via inline `style`/`stroke`/`fill`
with raw hex, not Tailwind classes:

- `< 40%` → **Crítico** → `#C0392B`
- `40–65%` → **En desarrollo** → `#E67E22`
- `≥ 65%` → **Sólido** → `#27AE60`

When composing a new score/percentage display, reuse these exact three hex
values and labels — don't invent a different threshold or palette for the
same concept.

## Typography

Single font family: **League Spartan** (`font-spartan` Tailwind class, or
the CSS var `--font-league-spartan`), weights 300/400/600/700. Headings are
typically `font-bold` (700), body copy `font-400`/default weight, small
uppercase labels (`text-xs font-bold tracking-widest uppercase`) are the
recurring pattern for badges/section labels (see `ProgressBar`'s area label,
`LeftPanel`'s "TU PERFIL" tag).

## Composition

Components take plain props — no context providers, no required wrapper.
`LeftPanel` is the one exception worth knowing: it's authored assuming a
dark (`mc-azul-marino`) parent background (its text is white/amarillo by
design) — always compose it inside a dark container, e.g. `DesktopLayout`'s
left column, never on a light background.

```tsx
import { DesktopLayout, LeftPanel, AreaBar } from 'mejora-diagnostico'

<DesktopLayout leftContent={<LeftPanel step="resultado" perfilTag="..." perfilRef="..." />}>
  <div className="max-w-md mx-auto px-6 py-16">
    <AreaBar nombre="Desarrollo Comercial" porcentaje={71} delay={0} />
  </div>
</DesktopLayout>
```

## Where the truth lives

Read `_ds_bundle.css` (compiled Tailwind output) and `styles.css` (its
`@import` entry point) before styling anything — they're the actual
utility classes shipped, not a summary. Per-component `.prompt.md` files
under `components/general/<Name>/` document each component's props.
