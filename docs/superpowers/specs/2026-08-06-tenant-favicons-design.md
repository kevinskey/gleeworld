# Tenant Logos as Browser-Tab Favicons

Date: 2026-08-06
Status: Approved (design), not yet implemented
Branch: `feat/tenant-favicons`
Worktree: `~/Documents/GitHub/gw-worktrees/tenant-favicons`

## Problem

Every tenant subdomain should show its own logo in the browser tab. Most of
this already works — `src/components/TenantFavicon.tsx` is mounted in
`App.tsx` and swaps the favicon to `gw_branding_settings.logo_url` once
branding loads — but three things are wrong.

### 1. `rel="shortcut icon"` is never swapped (bug)

`index.html` declares two icon links:

```html
<link rel="icon" type="image/png" href="/lovable-uploads/gleeworld-logo-192.png">
<link rel="shortcut icon" href="/lovable-uploads/gleeworld-logo-192.png">
```

`TenantFavicon` queries `link[rel="icon"]`. CSS attribute selectors are exact
matches, so `rel="shortcut icon"` never matches and that link keeps pointing at
the GleeWorld mark on every tenant. Browsers that honor the legacy shortcut
link, or that resolve the last-declared icon, show the wrong logo.

### 2. The tab flashes the GleeWorld logo before React mounts

`index.html` already patches `document.title` from `__TENANT_CONFIG__.org` in
an inline script, specifically so the tab never flashes the marketing title.
The favicon gets no equivalent treatment, so it shows GleeWorld until the React
bundle mounts, TanStack Query resolves `gw_branding_settings`, and
`TenantFavicon`'s effect fires.

`useBrandingSettings.ts:38` reads `TENANT?.logoUrl` as its loading fallback,
which implies someone intended a bootstrap-supplied logo — but no bootstrap
emits one. Verified against production:

```
$ curl -s https://demo.gleeworld.org/tenant-bootstrap.js
window.__TENANT_CONFIG__ = {
  tenant: 'demo',
  org: "Harmony Hall Choir",
  supabaseUrl: '...',
  supabaseAnonKey: '...'
};
```

So the fallback is always `null` and the flash always happens.

### 3. Logos are not square

`logo_url` is typically a wide wordmark at full resolution. Browsers squash it
into a 16×16 slot and clients download a large PNG for a tiny target. No
`favicon_url` column exists in `gw_branding_settings`.

## Decisions

1. **Fix the flash at the nginx layer, not in JS.** Rewrite the icon `href`s
   per-vhost with `sub_filter`, exactly as tenant `og:title` / `og:description`
   / `og:image` are already rewritten. Correct on first paint, no JS in the
   loop, and visible to crawlers.
2. **Use `logo_url` as-is.** No square-cropping, no new `favicon_url` column.
   Most choir logos are badges or crests that read acceptably at 16px. Revisit
   only if a tenant complains — a migration plus a Branding-tab upload field is
   not worth it on speculation.
3. **PWA / homescreen icons are out of scope.** `manifest.json` icons stay
   hardcoded GleeWorld. This change is about the browser tab.
4. **The main domain keeps the GleeWorld mark.** `gleeworld.org` gets no
   sub_filter rule, so it is unaffected by construction.

## Evidence the mechanism works

`demo.gleeworld.org` and the repo's `index.html` are the same file, one served
through the tenant vhost:

| Line | Repo `index.html` | Live `demo.gleeworld.org` |
|---|---|---|
| 10 `og:title` | `GleeWorld — Run your music program. Beautifully.` | `Harmony Hall Choir` |
| 19 `og:image` | `https://gleeworld.org/og-image.png` | `https://supabase.gleeworld.org/storage/v1/object/public/site-branding/demo-logo.png?v=1781539275` |
| 28 `rel="icon"` | `/lovable-uploads/gleeworld-logo-192.png` | *unchanged* |
| 29 `rel="shortcut icon"` | `/lovable-uploads/gleeworld-logo-192.png` | *unchanged* |

The rewrite is proven and the tenant's logo URL is already present in the
vhost's sub_filter set. Only the icon lines are unwired.

## Changes

### A. `src/components/TenantFavicon.tsx`

Broaden the selector to cover both link types:

```
- document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
+ document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
```

The append-if-missing branch and the `try/catch` stay as they are — the catch
exists because iOS WKWebView is strict about NodeList writes, and a cosmetic
favicon swap must never tear down the page.

### B. nginx vhost template and every existing tenant vhost

Add sub_filter rules rewriting both icon hrefs to the tenant's `logo_url`,
sourced from `gw_branding_settings` at provision time — the same value the
`og:image` rule already uses.

Requirements:

- `sub_filter_once off` — there are two icon lines to replace, and the default
  replaces only the first occurrence.
- Rules must land in the vhost **template** *and* in every already-provisioned
  tenant vhost, **including custom domains**. A rule added only to the template
  silently does nothing for existing tenants. This is the documented trap from
  the per-tenant link-previews work.

### C. `index.html`

Keep lines 28–29 as the platform default (they are what `gleeworld.org` and
unprovisioned hosts serve). Add a comment marking them as sub_filter match
strings, mirroring the warning that already sits above the `og:` tags:
changing this markup means updating the sub_filter match strings too, or the
rewrite silently stops matching.

## Out of scope

- `manifest.json` / PWA / homescreen icons.
- The iOS native app icon, which is fixed at the App Store level and cannot
  vary per tenant.
- A `favicon_url` branding column or square-crop derivative generation.
- Adding `logoUrl` to `tenant-bootstrap.js`. The nginx rewrite makes it
  unnecessary for the favicon. `useBrandingSettings`'s `TENANT?.logoUrl`
  fallback stays dead code for now; removing it is a separate cleanup.

## Known staleness (inherited, not introduced)

If a tenant changes their logo after provisioning, the vhost still points at
the old URL until re-provisioned. This is already true of their `og:image`, so
it is one existing refresh path rather than a new one. Re-running provisioning
must update the icon rules alongside the `og:` rules — verify this rather than
assume it.

## Verification

**Browsers cache favicons aggressively and will show a stale icon long after
the server is correct. Looking at a browser tab is not evidence.** The check is
server-side, where the rewrite either fired or did not:

```
curl -s https://demo.gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
```

Both lines must show the tenant's logo URL. Repeat on:

- a second tenant subdomain, confirming it gets *its own* logo and not demo's;
- a custom domain, confirming the rule reached non-`*.gleeworld.org` vhosts;
- `gleeworld.org`, confirming it still serves the GleeWorld mark.

Unit test: a jsdom Vitest case for `TenantFavicon` asserting that a document
containing both `rel="icon"` and `rel="shortcut icon"` has *both* hrefs patched
to `logo_url`. This test fails against the current implementation, which is the
point.

Gate on added failures, not zero — the repo carries a Vitest and typecheck
baseline that drifts. Re-measure on `origin/main` first.

## Deployment

1. Frontend: `bash scripts/deploy-frontend.sh` (never `rsync --delete` — the
   per-tenant bootstrap files under `/var/www/gleeworld/html/tenants/` are not
   in `dist/`).
2. nginx: update the template and existing vhosts, `nginx -t` before reload.
3. Verify with the `curl` checks above, not by eye.
