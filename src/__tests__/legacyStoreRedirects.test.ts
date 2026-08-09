import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * /product-management and /store/products used to render ProductManagement
 * directly — the SAME component /dashboard/shop renders (and the same one
 * the 'merch' catalog entry pointed at, at /store/products, before the
 * Phase 5 nav consolidation retired it — see MERGED_KEYS in
 * src/lib/navigation/myTools.ts). A member browsing All Tools saw two
 * differently-labelled entries land on one identical admin screen.
 * Consolidated 2026-08-09: both legacy paths now redirect to
 * /dashboard/shop so existing links/bookmarks keep working, behind the
 * single gated route.
 *
 * App.tsx is a ~3000-line route table wired to Auth/Tenant/Query providers
 * — too heavy to mount in a unit test (no test in this repo renders it
 * whole; component-level tests wrap only the component under test in their
 * own MemoryRouter). This is a source scan instead, the same tradeoff
 * src/components/public-site/blocks/__tests__/widthConformity.test.ts makes
 * for the same reason. It is a coarse net, but it catches exactly the
 * regression that matters here: either legacy path silently going back to
 * rendering ProductManagement directly (reopening the duplicate-entry
 * confusion), or the redirect target drifting off /dashboard/shop.
 */
const APP_SOURCE = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf-8');

const LEGACY_PATHS = ['/product-management', '/store/products'];

describe('legacy store routes redirect to the consolidated /dashboard/shop', () => {
  it.each(LEGACY_PATHS)('%s is a <Navigate> to /dashboard/shop', (path) => {
    const escaped = path.replace(/\//g, '\\/');
    const routeRe = new RegExp(
      `<Route path="${escaped}" element=\\{<Navigate to="/dashboard/shop" replace \\/>\\} />`,
    );
    expect(APP_SOURCE, `expected a redirect Route for ${path}`).toMatch(routeRe);
  });

  it('neither legacy path still renders ProductManagement directly', () => {
    for (const path of LEGACY_PATHS) {
      const idx = APP_SOURCE.indexOf(`path="${path}"`);
      expect(idx, `route for ${path} not found in App.tsx`).toBeGreaterThan(-1);
      const routeLine = APP_SOURCE.slice(idx, APP_SOURCE.indexOf('\n', idx));
      expect(routeLine).not.toContain('<ProductManagement');
    }
  });

  it('/dashboard/shop is still the one live route that renders ProductManagement', () => {
    const idx = APP_SOURCE.indexOf('path="/dashboard/shop"');
    expect(idx).toBeGreaterThan(-1);
    const chunk = APP_SOURCE.slice(idx, idx + 800);
    expect(chunk).toContain('<ProductManagement');
  });
});
