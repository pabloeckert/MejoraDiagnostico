# design-sync notes — MejoraDiagnostico

## Repo shape

This repo is a single-purpose Next.js diagnostic app, not a publishable
component library — there is no `dist/`, no `main`/`module`/`exports` in
`package.json`, and `npm run build` builds the whole Next app, not a
synced-able entry. The sync runs in **synth-entry mode**: the converter
builds `.pkg-entry.mjs` directly from `components/*.tsx`.

To make synth-entry resolve `PKG_DIR` to the repo root (so `package.json`'s
`name`/`version` are picked up), `package-build.mjs` is invoked with
`--entry ./components/__synth__.tsx` — a **deliberately non-existent** file.
`resolveDistEntry`'s soft mode returns null for a missing override (triggering
synth-entry), while the early PKG_DIR walk-up only needs the file's `dirname`,
which resolves fine without the file existing. Don't "fix" this by pointing
`--entry` at a real component file — that gets treated as an actual dist
entry and bundles only that one file (this was the first failure mode hit
during the initial sync).

## Fork: `.design-sync/overrides/source-kit.mjs`

All 8 components are `export default function Name() {}`. The stock
synth-entry writer in `lib/source-kit.mjs` emits `export * from <path>` for
each file — `export *` never re-exports a default, so
`window.MejoraDiagnostico.<Name>` never got assigned (`[BUNDLE_EXPORT]`
failure on every component, first full validate run). The fork adds a
`export { default as <Name> } from <path>` alias per file, recovering
`<Name>` via ts-morph the same way `deriveComponentsFromSrc` already does.
Re-copy this fork on every fresh clone/re-sync (`cp .ds-sync/lib/source-kit.mjs`
target stays a fork, not the stock file) and re-create the `.design-sync/node_modules`
symlink (`ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`) so the
fork's bare `ts-morph` import resolves.

## CSS tokens

No static dist stylesheet exists either — `cfg.buildCmd` compiles one via the
project's own Tailwind config: `npx tailwindcss -i app/globals.css -o
.design-sync/.cache/tailwind-build.css --config tailwind.config.js`. Re-run
this before every `package-build.mjs` invocation (it's gitignored —
regenerated, not committed). `cfg.cssEntry` points at that compiled file.

## Fonts

League Spartan is loaded via `next/font/google` in `app/layout.tsx`, so no
`@font-face` ships in any committed file. `.design-sync/fonts-src/league-spartan/`
holds a manually-fetched copy: League Spartan ships as a single **variable**
woff2 (weights 300–700 all resolve to the same file from Google's CDN —
confirmed by identical file hashes across requested weights), so one
`fonts.css` declares 4 weight-pinned `@font-face` rules all pointing at the
one `league-spartan-variable.woff2`. Wired via `cfg.extraFonts`. License:
OFL (Google Fonts), safe to bundle.

## Brand logo asset

`LeftPanel.tsx` references `/logo-blanco.png` (an absolute path resolved
against the Next.js `public/` root at runtime). The converter has no
mechanism for copying arbitrary `public/` assets, so after every
`package-build.mjs` run, manually copy it into the bundle root so the
existing absolute reference resolves when served:
```
cp public/logo-blanco.png ds-bundle/logo-blanco.png
```
It's included in the upload plan's `writes` as a literal top-level path
(`logo-blanco.png`, alongside `_ds_bundle.js`/`styles.css`/etc.) — not under
any of the globbed dirs.

## Known limitation: GaugeGlobal's preview can't be statically captured mid-animation

`GaugeGlobal` triggers a ~2.7s animation (1.2s "calculating" phase + 1.5s
`requestAnimationFrame` count-up/needle-sweep) on mount, gated behind an
`IntersectionObserver`. `package-capture.mjs` screenshots immediately after
`networkidle` + a fonts/images settle — well before the animation
completes — so the authored preview's 3 cells (`Default`/`Bajo`/`Alto`)
capture a transitional "..." frame rather than the settled gauge reading.
Confirmed non-deterministic by re-running capture twice: one re-run caught
a mid-sweep frame, the other still showed the initial calc state. This is
inherent to the component (any consumer mounting it fresh sees the same
animation), not a flaw in the preview's props/composition — there's no prop
to start it "already settled," and forking the shared `package-capture.mjs`
to add an extra wait is out of scope (it's not behind the per-repo override
mechanism the way `lib/*.mjs` adapters are). Graded `needs-work` with this
note in `.design-sync/.cache/review/GaugeGlobal.grade.json`; the component
still ships fully functional in the bundle. Revisit if a future sync wants
to chase a fixed-delay workaround in the preview `.tsx` itself (e.g. forcing
a no-op re-render after a `setTimeout` doesn't help — the delay is internal
component state, not observable/controllable from the story).

## Re-sync risks

- The synth-entry `--entry __synth__.tsx` trick and the `source-kit.mjs`
  fork are both load-bearing — removing either breaks the bundle silently
  differently (zero components found, or components found but not exported
  on `window.MejoraDiagnostico`).
- `cfg.buildCmd` (Tailwind compile) and the logo copy are NOT run
  automatically by `package-build.mjs` — both are manual steps until/unless
  a future sync wires them into a wrapper script.
- If `LeftPanel`, `DesktopLayout`, or any future component starts reading
  `useDiagnostico`/`sessionStorage`/other app-level state instead of plain
  props, synth-entry composition stops working for it — re-check before
  assuming a new component is preview-able the same way as these 8.
- Tailwind's compiled CSS only includes utility classes Tailwind's content
  scan actually finds across the repo at compile time — adding a new
  component with novel utility classes requires re-running `buildCmd`
  before the next build, or its styles will be missing from the bundle.
