# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev                # Vite dev server on :8080 (host ::)
npm run build              # Production SPA build → dist/
npm run build:dev          # Build with development mode (unminified, source maps)
npm run lint               # ESLint (flat config, TS + React Hooks + React Refresh)
npm run test               # vitest run (single pass, no watch)
npm run test:studio        # Only src/lib/studio tests
npm run typecheck:guard    # Baseline-diff typecheck (see "Typechecking" below)

# Run a single test file
npx vitest run path/to/file.test.ts

# Interactive watch mode
npx vitest

# Regenerate the typecheck baseline (only when intentionally landing new errors)
node scripts/typecheck-baseline.mjs --write-baseline
```

Deploy to web: `bash scripts/deploy-frontend.sh` (build → rsync → fix perms → verify live hash). Read the script header before touching it — it exists specifically because `rsync -az` alone gets it wrong here.

Deploy to iOS: `npm run build && npx cap sync ios`, then archive/upload from Xcode (`ios/App/App.xcworkspace`). Bundle id `org.gleeworld.app`, team `AUJY92SA4D`.

## Architecture

**Stack:** Vite + React 18 + TypeScript, Tailwind + shadcn/Radix, React Router v6, TanStack Query, Supabase (self-hosted at `supabase.gleeworld.org`), Vitest. Capacitor 7 wraps the SPA for iOS/Android. Sidecar backends: `fastapi_backend/`, `python_backend/`, `worker/video-transcoder/`. Supabase Edge Functions (~300) live in `supabase/functions/`.

**Multi-tenant model.** One frontend build serves many tenants, one per subdomain (e.g. `demo.gleeworld.org`, choir-specific domains). `index.html` fetches `/tenant-config.json` at boot and sets `window.__TENANT_CONFIG__`, which `src/integrations/supabase/client.ts` reads to pick the Supabase URL, anon key, tenant slug, and DB name. Every anon request carries `x-tenant-slug` (and optionally `x-tenant-db`) headers; RLS policies scope reads to that tenant via `anon_tenant_id()`. **Consequence:** never assume a single-tenant world — `getTenantSlug()` and tenant-scoped queries are the norm, and per-tenant bootstrap files under `/var/www/gleeworld/html/tenants/` on the droplet must survive deploys (hence no `rsync --delete`).

**Routing.** All routes are in `src/App.tsx`, using React Router v6 and `React.lazy()` for anything not on the public landing path. Route guards live in `src/components/routing/` and `src/components/routes/` (`FanRoute`, `GraduatesRoute`, `HomeRoute`, `ControlCenterRedirect`, etc.). Global providers wrap the router: `AuthProvider`, `ThemeProvider`, `MusicPlayerProvider`, `CourseProvider`, `MessengerProvider`, `ActiveMeetingProvider`, `AudioCompanionProvider`, TanStack `QueryClientProvider`.

**Layout shell.** Authenticated app pages wrap in `UniversalLayout` + `DashboardShell` (left sidebar), not bare `UniversalHeader`. Public/marketing pages use `UniversalLayout` with header/footer enabled. Academy has its own `AcademyShell`.

**Feature organization.**
- `src/pages/` — route-level pages (~200 files). Subfolders: `admin/`, `academy/`, `auth/`, `courses/`, `dashboard/`, `studio/`, `grading/`, `dues-management/`.
- `src/features/` — cross-cutting feature bundles: `docs/` (in-app manual reader), `read-music/`, `store/`.
- `src/modules/` — larger domain modules: `rehearsals/`, `performance/`, `glee-library/`, `logistics/`, `wellness/`.
- `src/components/` — shared UI (shadcn primitives under `ui/`), plus feature-scoped groups (`academy/`, `messenger/`, `music/`, `pwa/`, `voice/`, `video/`, etc.).
- `src/lib/` — utilities, including `studio/` (audio/DAW code with its own vitest suite).
- `src/integrations/supabase/` — client + generated `Database` types.
- `src/contexts/` — global providers listed above.

**Backend surface.**
- `supabase/functions/` — Deno Edge Functions for box office, LTI, appointments, AI (grading, chat, audio analysis), SMS/broadcast, Stripe webhooks, admin operations. Shared code in `_shared/`.
- `supabase/migrations/` — 2,377+ SQL migrations. New schema changes go here; never edit historical ones.
- `fastapi_backend/` and `python_backend/` — Python services with their own READMEs and `requirements.txt`.
- `worker/video-transcoder/` — video processing worker.

**Native (Capacitor 7).** iOS project at `ios/App/`, workspace `App.xcworkspace`, Podfile-managed. Live Activity extension: `RecordingLiveActivityExtension`. Config in `capacitor.config.ts`: edge-to-edge status bar (`overlaysWebView: true`), push notifications, splash screen. Web assets sync to `ios/App/App/public/`. Do not check for URL scheme; `webContentsDebuggingEnabled: true` is intentional (iOS 16.4+ requires it for Safari Web Inspector).

## Typechecking

`tsconfig.app.json` uses `noCheck: true` for CI speed; **`npm run typecheck:guard` is the real gate** — it runs `tsc --noCheck false` and diffs against `.typecheck-baseline.txt`, failing only on newly-introduced errors. Reading the baseline is fine, editing it is not (except via `--write-baseline` after an intentional migration). Line/col + absolute paths are normalized out, so unrelated edits don't churn the diff.

## Vite / chunking gotchas

`vite.config.ts` has hand-tuned `manualChunks` and comments that reflect earned scars:

- **Never split** `react`, `react-dom`, Radix, or shadcn into their own chunks. Chunks that consume React initialize before React's module runs → `useState is undefined` white screens.
- `worker: { format: 'es' }` is required — pdfjs 5's `pdf.worker.mjs` is an ES module and Vite's default IIFE format silently breaks `getDocument()`.
- Heavy deps that ARE split: `verovio`, `heic2any`, `pdfjs`, `pdf-viewer`, `pdf-tools`, `html2canvas`, `osmd`, `tone`, `charts`, `markdown`, `date-locale`. Cuts main bundle from ~8.8MB → ~3–4MB so the iPad 20s boot watchdog doesn't fire.
- Service worker cache version: `dist/sw.js` has `__GW_BUILD_VERSION__` replaced with the short git SHA by the `bumpSwVersion` build plugin, so every deploy busts SW caches automatically.

## Boot resilience

`src/main.tsx` installs a raw error handler that renders a red debug UI + "Clear storage and reload" button into `#root` if a module-level throw happens before React can mount `BootErrorBoundary`. WKWebView users have no devtools, so a silent white screen is the worst outcome — never remove or bypass this. Same reason `installAudioUnlock()` runs unconditionally.

## Demo mode

`installDemoWriteInterceptor()` (in `src/lib/demoSession.ts`, called from `App.tsx`) turns RLS write-rejections into a friendly `DemoBar` toast for demo tenants. It's a no-op elsewhere. If you see a demo-only bug about "silent" writes, that's the flow to inspect.

## Deploy notes (web)

`scripts/deploy-frontend.sh` does what a bare `rsync -az dist/ …` does not:

1. `chmod a+rX` on the served dir. Kevin's local `dist/sw.js` is written mode 600; `rsync -a` preserves that, nginx serves 403 for `sw.js`, service workers never see the update, and clients pin to a stale bundle indefinitely.
2. Diffs the local `index-*.js` hash and `sw.js CACHE_VERSION` against the live site so a broken deploy is caught immediately.
3. `--delete` is deliberately absent — per-tenant bootstrap files live under `/var/www/gleeworld/html/tenants/` on the droplet and are not in `dist/`.

Skip the build if you already have a fresh dist: `bash scripts/deploy-frontend.sh --skip-build`.
