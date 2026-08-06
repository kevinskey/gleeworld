# Tenant Favicons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every tenant subdomain shows its own logo in the browser tab, from first paint, with no GleeWorld flash.

**Architecture:** Two independent layers. nginx rewrites the icon `href`s per-vhost with `sub_filter` so the correct logo is in the HTML before any JavaScript runs — the same mechanism that already rewrites `og:image`. `TenantFavicon` (React) remains the second layer, updating the icons once the DB branding row loads; a one-line selector fix makes it cover `rel="shortcut icon"`, which it silently misses today.

**Tech Stack:** React 18 + TypeScript, Vitest (jsdom), nginx `sub_filter`, static SPA served from `/var/www/gleeworld/html/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-tenant-favicons-design.md`.
- Work in the worktree `~/Documents/GitHub/gw-worktrees/tenant-favicons`, branch `feat/tenant-favicons`. The main checkout is shared with other sessions.
- Worktrees need `npm ci --legacy-peer-deps` — a plain `npm ci` fails on a `pdfjs-dist` peer conflict. Never pipe npm to `tail`; it hides the failure.
- Use `logo_url` as-is. Do **not** add a `favicon_url` column, and do not generate square crops.
- Do **not** touch `manifest.json`, PWA icons, or the iOS app icon. Out of scope.
- Do **not** add `logoUrl` to `tenant-bootstrap.js`. Out of scope.
- `gleeworld.org` (the main domain) must keep the GleeWorld mark.
- Deploy the frontend only with `bash scripts/deploy-frontend.sh`. Never `rsync --delete` — per-tenant bootstrap files under `/var/www/gleeworld/html/tenants/` are not in `dist/`.
- The repo carries a Vitest and typecheck baseline that drifts. Gate on **added** failures, not zero. `npm run typecheck:guard` is the real typecheck gate.
- **Browsers cache favicons aggressively. A browser tab is never evidence.** Verify with `curl` against the served HTML.

---

### Task 1: Fix the `rel="shortcut icon"` selector bug

`index.html` declares two icon links. `TenantFavicon` queries `link[rel="icon"]`, and CSS attribute selectors are exact matches, so `rel="shortcut icon"` never matches and keeps pointing at the GleeWorld mark on every tenant.

**Files:**
- Modify: `src/components/TenantFavicon.tsx:22` (the `icons` query) and `:24-31` (the append-if-missing branch)
- Test: `src/components/TenantFavicon.test.tsx` (create)

**Interfaces:**
- Consumes: `useBrandingSettings()` from `@/hooks/useBrandingSettings`, which returns `{ settings, isLoading, refetch }` where `settings: BrandingSettings` has `logo_url: string | null` and `org_name: string | null`.
- Produces: nothing new. `TenantFavicon` stays a `() => null` component already mounted at `src/App.tsx:543`.

- [ ] **Step 1: Write the failing test**

Create `src/components/TenantFavicon.test.tsx`. The `// @vitest-environment jsdom` docblock on line 1 is required — `vitest.config.ts` sets `environment: 'node'` globally, so without it `document` is undefined. Mock `useBrandingSettings` rather than rendering the real hook, which needs `getTenantSlug()` and a queryable Supabase client; this mirrors `src/components/assistant/AssistantFab.test.tsx:17-20`.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TenantFavicon } from './TenantFavicon';

const LOGO = 'https://supabase.gleeworld.org/storage/v1/object/public/site-branding/demo-logo.png';

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { logo_url: LOGO, org_name: 'Harmony Hall Choir' },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  // Mirror the two icon links shipped in index.html:28-29.
  document.head.innerHTML = `
    <link rel="icon" type="image/png" href="/lovable-uploads/gleeworld-logo-192.png">
    <link rel="shortcut icon" href="/lovable-uploads/gleeworld-logo-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2">
  `;
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

const hrefOf = (rel: string) =>
  document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.getAttribute('href');

describe('TenantFavicon', () => {
  it('points rel="icon" at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('icon')).toBe(LOGO);
  });

  it('points rel="shortcut icon" at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('shortcut icon')).toBe(LOGO);
  });

  it('points apple-touch-icon at the tenant logo', () => {
    render(<TenantFavicon />);
    expect(hrefOf('apple-touch-icon')).toBe(LOGO);
  });

  it('sets the document title to the org name', () => {
    render(<TenantFavicon />);
    expect(document.title).toBe('Harmony Hall Choir');
  });

  it('appends an icon link when the document has none', () => {
    document.head.innerHTML = '';
    render(<TenantFavicon />);
    expect(hrefOf('icon')).toBe(LOGO);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/TenantFavicon.test.tsx`

Expected: the `rel="shortcut icon"` case FAILS with the received value `"/lovable-uploads/gleeworld-logo-192.png"` instead of the logo URL. The other four cases PASS — they already work today. If the shortcut case passes, stop: the bug is not reproduced and the premise is wrong.

- [ ] **Step 3: Broaden the selector**

In `src/components/TenantFavicon.tsx`, change the query on line 22 to cover both link types, and set `rel="icon"` on the appended fallback link (unchanged behavior, restated here because the surrounding lines move):

```tsx
      // Update rel="icon" and the legacy rel="shortcut icon" (attribute
      // selectors are exact matches, so "icon" alone never matched the
      // shortcut link and it kept the GleeWorld mark on every tenant), plus
      // rel="apple-touch-icon" for iOS homescreen. NodeLists aren't writable
      // so don't try to assign into them — either patch existing links in
      // place, or append a new one.
      const icons = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'),
      );
      if (icons.length === 0) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = logoUrl;
        document.head.appendChild(link);
      } else {
        icons.forEach((l) => l.setAttribute('href', logoUrl));
      }
```

Leave the `try/catch` and the `console.warn` exactly as they are. The catch exists because iOS WKWebView is strict about NodeList writes, and a cosmetic favicon swap must never tear down the page.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/TenantFavicon.test.tsx`

Expected: all 5 tests PASS.

- [ ] **Step 5: Confirm no new failures elsewhere**

Run: `npm run test 2>&1 | tail -20` and `npm run typecheck:guard`

Expected: `typecheck:guard` reports no newly-introduced errors. For Vitest, compare the failure count against `origin/main` — the baseline drifts, so measure it rather than expecting zero:

```bash
git stash && npm run test 2>&1 | tail -5   # baseline
git stash pop && npm run test 2>&1 | tail -5   # must not be worse
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TenantFavicon.tsx src/components/TenantFavicon.test.tsx
git commit -m "fix(branding): swap rel=\"shortcut icon\" to the tenant logo

link[rel=\"icon\"] is an exact-match attribute selector, so the legacy
shortcut link in index.html was never patched and kept the GleeWorld
mark on every tenant subdomain.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Mark the icon tags as sub_filter match strings

Once nginx rewrites these lines, their exact markup becomes load-bearing. The `og:` block directly above them already carries this warning; the icon tags need the same one, because a future "tidy up the favicon tags" commit is exactly how this breaks — silently, with no test failure.

**Files:**
- Modify: `index.html:27-32`

**Interfaces:**
- Consumes: nothing.
- Produces: the literal strings that Task 3's nginx rules match on. The `href` values and attribute order must not change after this task.

- [ ] **Step 1: Add the comment**

Replace the `<!-- Favicon and PWA icons -->` comment at `index.html:27` with:

```html
    <!-- Favicon and PWA icons.
         These two icon hrefs are REWRITTEN PER TENANT by nginx sub_filter
         (same mechanism as the og: tags above), so the tenant's logo is in
         the HTML on first paint and the tab never flashes the GleeWorld
         mark. That makes this markup a match string: changing the href,
         the attribute order, or the whitespace means updating the
         sub_filter rules too, or the rewrite silently stops matching and
         every tenant quietly reverts to the GleeWorld icon.
         The values below are the platform default, served by gleeworld.org
         and any host with no tenant vhost. TenantFavicon.tsx patches them
         again client-side once the branding row loads. -->
    <link rel="icon" type="image/png" href="/lovable-uploads/gleeworld-logo-192.png">
    <link rel="shortcut icon" href="/lovable-uploads/gleeworld-logo-192.png">
```

Leave the three `apple-touch-icon` lines below unchanged — they are not rewritten by nginx.

- [ ] **Step 2: Verify the build still produces the icon lines verbatim**

Run: `npm run build && grep -c 'lovable-uploads/gleeworld-logo-192.png' dist/index.html`

Expected: `2`. Vite copies `index.html` through with the icon tags intact; if this prints anything else, the sub_filter match strings would not appear in the served HTML and Task 3 cannot work.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "docs(index): mark favicon tags as nginx sub_filter match strings

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Rewrite the icon hrefs per tenant in nginx

**This task runs against the production droplet, not the repo.** Confirm with Kevin before applying, and capture a backup of each vhost first.

**Files:**
- Modify (droplet): the tenant vhost template used by provisioning, and every existing tenant vhost under nginx's `sites-available`, **including custom domains**.

**Interfaces:**
- Consumes: the exact `href` strings frozen by Task 2, and each tenant's `logo_url` — the same value the existing `og:image` rule already substitutes for that vhost.
- Produces: served HTML in which both icon `href`s are the tenant's logo URL.

- [ ] **Step 1: Find the existing og:image rule and confirm the pattern**

```bash
ssh <droplet> "grep -rn 'og:image' /etc/nginx/sites-available/ | head -20"
```

Expected: a `sub_filter` line per tenant vhost substituting the platform default `https://gleeworld.org/og-image.png` for that tenant's logo URL. Read one vhost end-to-end before editing anything — note whether `sub_filter_once` is already set, and whether `sub_filter_types` is configured. Reuse whatever convention is already there rather than inventing a second one.

- [ ] **Step 2: Back up every vhost**

```bash
ssh <droplet> "sudo tar czf /root/nginx-sites-$(date +%Y%m%d-%H%M).tar.gz /etc/nginx/sites-available/"
```

Expected: a tarball is written. Do not proceed without it — Task 3 edits every tenant vhost, and a bad edit takes down all tenants at once.

- [ ] **Step 3: Add the icon rules to ONE tenant vhost first (demo)**

Add alongside the existing `og:image` rule, substituting demo's logo URL:

```nginx
    sub_filter_once off;
    sub_filter '<link rel="icon" type="image/png" href="/lovable-uploads/gleeworld-logo-192.png">'
               '<link rel="icon" type="image/png" href="LOGO_URL">';
    sub_filter '<link rel="shortcut icon" href="/lovable-uploads/gleeworld-logo-192.png">'
               '<link rel="shortcut icon" href="LOGO_URL">';
```

`sub_filter_once off` is required: there are two lines to replace and the default stops after the first match. If the vhost already sets `sub_filter_once off` for the og: rules, do not add a second directive.

Replace `LOGO_URL` with demo's actual logo, which is already visible in the served HTML today:

```bash
curl -s https://demo.gleeworld.org/ | grep 'og:image'
# https://supabase.gleeworld.org/storage/v1/object/public/site-branding/demo-logo.png?v=1781539275
```

- [ ] **Step 4: Test the config and reload**

```bash
ssh <droplet> "sudo nginx -t && sudo systemctl reload nginx"
```

Expected: `syntax is ok` / `test is successful`, then a clean reload. If `nginx -t` fails, restore from the Step 2 tarball before doing anything else.

- [ ] **Step 5: Verify the rewrite server-side**

```bash
curl -s https://demo.gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
```

Expected: **both** lines show demo's logo URL, not `/lovable-uploads/gleeworld-logo-192.png`. This is the real gate — it reads the bytes nginx served, with no browser cache and no JavaScript in the loop. Do not check a browser tab; it will lie.

- [ ] **Step 6: Confirm the main domain is untouched**

```bash
curl -s https://gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
```

Expected: both lines still show `/lovable-uploads/gleeworld-logo-192.png`. `gleeworld.org` gets no rule and must keep the GleeWorld mark.

- [ ] **Step 7: Roll out to the remaining vhosts**

Repeat Steps 3–5 for every other tenant vhost, using each tenant's own logo URL. Then add the rules to the **provisioning template** so newly-provisioned tenants get them automatically.

For each tenant, verify with the Step 5 `curl` and confirm it shows **that tenant's** logo — not demo's. A copy-paste error here gives one tenant another tenant's branding, which is worse than the bug being fixed.

Include custom domains. A rule added only to the template does nothing for already-provisioned tenants, and a rule added only to `*.gleeworld.org` vhosts misses custom domains entirely.

- [ ] **Step 8: Confirm re-provisioning preserves the rules**

Read the provisioning script's vhost-generation path and confirm that re-running it for an existing tenant emits the icon rules alongside the `og:` rules with the current `logo_url`. If it does not, the first logo change a tenant makes will silently revert their favicon.

Expected: re-provisioning a tenant produces a vhost whose icon rules match their current `logo_url`. Report what you find rather than assuming — the spec flags this as inherited staleness, not a solved problem.

---

### Task 4: Deploy the frontend and verify end to end

**Files:** none modified. This task ships Tasks 1–2.

- [ ] **Step 1: Deploy**

```bash
bash scripts/deploy-frontend.sh
```

Expected: the script builds, rsyncs, fixes permissions, and reports that the live `index-*.js` hash matches the local one. Never add `--delete`.

- [ ] **Step 2: Verify the served HTML on two tenants and the main domain**

```bash
curl -s https://demo.gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
curl -s https://<second-tenant>.gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
curl -s https://gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'
```

Expected: each tenant shows its own logo on both lines; `gleeworld.org` shows the GleeWorld mark on both lines.

- [ ] **Step 3: Verify the client-side layer still works**

In a browser with cache disabled (DevTools → Network → Disable cache), load a tenant subdomain and confirm in the Elements panel that both icon links carry the tenant logo after React mounts. Check the console for `[TenantFavicon] favicon update failed` — it must not appear.

This step checks the DOM, not the rendered tab icon. The tab icon is cached and is not evidence.

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "Tenant logos as browser-tab favicons" --body "$(cat <<'EOF'
Fixes the `rel="shortcut icon"` link never being swapped (exact-match
attribute selector), and removes the pre-React GleeWorld flash by
rewriting both icon hrefs per-vhost in nginx — the same mechanism that
already rewrites og:image.

Spec: docs/superpowers/specs/2026-08-06-tenant-favicons-design.md

Verified server-side (browser favicon caches are not evidence):

    curl -s https://demo.gleeworld.org/ | grep -i 'rel="\(shortcut \)\?icon"'

Out of scope: manifest.json / PWA icons, the iOS app icon, a favicon_url
column, and adding logoUrl to tenant-bootstrap.js.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Change A — `TenantFavicon` selector | Task 1 |
| Change B — nginx sub_filter, template + existing vhosts + custom domains | Task 3 |
| Change C — `index.html` match-string comment | Task 2 |
| Main domain unaffected | Task 3 Step 6, Task 4 Step 2 |
| Known staleness / re-provisioning | Task 3 Step 8 |
| Verification by `curl`, not by eye | Task 3 Step 5, Task 4 Steps 2–3 |
| Deployment | Task 4 |
| Out of scope (manifest, iOS icon, favicon_url, bootstrap logoUrl) | Global Constraints |

No gaps.

**Type consistency:** `logo_url` (DB/`BrandingSettings` field) and `logoUrl` (the local in `TenantFavicon`) are used consistently and are not interchanged. `hrefOf` is defined once in the test file and used in all five cases.

**Ordering note:** Task 2 freezes the match strings that Task 3 depends on, so Task 2 must land before Task 3 runs against the droplet. Task 1 is independent and could ship alone.
