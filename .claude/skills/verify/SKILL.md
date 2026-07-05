---
name: verify
description: Build, run, and drive GleeWorld locally to verify a change end-to-end (preview server + Playwright at real phone/desktop viewports)
---

# Verifying GleeWorld changes

## Build + run

```bash
npm install --legacy-peer-deps   # plain install fails on peer conflicts
VITE_SUPABASE_URL="https://supabase.gleeworld.org" \
VITE_SUPABASE_ANON_KEY="<anon key from https://gleeworld.org/tenant-bootstrap.js>" \
npm run build
npm run preview -- --port 4199 --strictPort
```

The anon key is public — read it from `tenant-bootstrap.js` on the live site.
Preview connects to production Supabase; keep verification read-only, or
delete anything you create (the demo tenant is public — App Store reviewers
see it).

## Drive

Playwright (`playwright-core` + system Chrome, or plain `playwright`),
context options for phone verification:

```js
{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true }
```

- Login form is at `/auth` (NOT `/login` — that 404s).
  `demo@gleeworld.org` / `GleeDemo2026!` works. On production, demo users
  redirect to `demo.gleeworld.org`; on local preview they stay put.
- For record/mic flows launch Chrome with
  `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`.
- Mobile overflow check: `max(documentElement.scrollWidth, body.scrollWidth) - 390`
  after ~3s settle; > 4px = broken. `overflow-x:hidden` on html/body masks
  it visually but scrollWidth still reveals it.
- Toasts (sonner) auto-dismiss ~4s — poll `[data-sonner-toast]` during the
  action, not after.

## Gotchas

- Write-heavy E2E against production and direct pushes to main are
  blocked — verify on local preview of the same build, ship via PR.
- Theme tokens are per-tenant: `--primary-foreground` is dark on some
  tenants (demo/HBCU). Contrast bugs may only reproduce under a tenant
  theme, not the default one — check computed colors, not just looks.
- CSP is an index.html meta tag; a missing directive fails silently
  (console-only fetch errors).
