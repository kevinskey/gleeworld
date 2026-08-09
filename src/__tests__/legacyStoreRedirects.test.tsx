// @vitest-environment jsdom
//
// /product-management and /store/products used to render ProductManagement
// directly — the SAME component /dashboard/shop renders (and the same one
// the 'merch' catalog entry pointed at, at /store/products, before the
// Phase 5 nav consolidation retired it — see MERGED_KEYS in
// src/lib/navigation/myTools.ts). A member browsing All Tools saw two
// differently-labelled entries land on one identical admin screen.
// Consolidated 2026-08-09: both legacy paths now redirect to
// /dashboard/shop so existing links/bookmarks keep working, behind the
// single gated route.
//
// Round 1 review: the first version of this file was a source scan (grep
// over App.tsx's text) — it would have stayed green even if the redirect's
// router semantics changed entirely, and it's how the query-string bug (a
// bare <Navigate> drops ?search and #hash) slipped through. This version
// mounts the REAL RedirectPreservingQuery component in a real
// MemoryRouter/Routes tree — actual react-router matching and navigation,
// not text matching.
//
// It's imported from src/components/routing/RedirectPreservingQuery.tsx,
// not from '../App': App.tsx itself is ~3000 lines wired to Auth/Tenant/
// Query providers with import-time side effects (setupMobileAudioUnlock()
// calls window.matchMedia at module scope) that jsdom doesn't provide
// without a polyfill this suite doesn't carry, and nothing else in this
// repo mounts App.tsx whole (every other page test wraps only the
// component under test in its own MemoryRouter) — so the routes below are
// a minimal tree using the SAME path strings and the SAME imported
// component App.tsx's real route table uses, not a reimplementation of the
// redirect logic.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RedirectPreservingQuery } from '../components/routing/RedirectPreservingQuery';

const LEGACY_PATHS = ['/product-management', '/store/products'];

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/product-management" element={<RedirectPreservingQuery to="/dashboard/shop" />} />
        <Route path="/store/products" element={<RedirectPreservingQuery to="/dashboard/shop" />} />
        <Route
          path="/dashboard/shop"
          element={<LandedProbe />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// Renders the landed location's full path (pathname + search + hash) as
// text, so the assertions below read the ACTUAL post-navigation URL rather
// than inspecting router internals.
function LandedProbe() {
  const loc = useLocation();
  return <div data-testid="landed">{loc.pathname}{loc.search}{loc.hash}</div>;
}

describe('legacy store routes redirect to the consolidated /dashboard/shop', () => {
  it.each(LEGACY_PATHS)('%s redirects to /dashboard/shop with no query/hash', (path) => {
    renderAt(path);
    expect(screen.getByTestId('landed')).toHaveTextContent('/dashboard/shop');
  });

  it.each(LEGACY_PATHS)('%s preserves a query string across the redirect', (path) => {
    renderAt(`${path}?tab=orders`);
    expect(screen.getByTestId('landed')).toHaveTextContent('/dashboard/shop?tab=orders');
  });

  it.each(LEGACY_PATHS)('%s preserves a hash across the redirect', (path) => {
    renderAt(`${path}#payments`);
    expect(screen.getByTestId('landed')).toHaveTextContent('/dashboard/shop#payments');
  });

  it('preserves BOTH a query string and a hash together', () => {
    renderAt('/store/products?tab=orders#top');
    expect(screen.getByTestId('landed')).toHaveTextContent('/dashboard/shop?tab=orders#top');
  });
});

// Secondary, narrow wiring check: proves App.tsx's real route table for
// these two paths actually USES the component the tests above exercise,
// rather than some other redirect mechanism. This is deliberately NOT the
// primary proof (that's the behavioral tests above) — it exists only to
// catch "the route was pointed at something else" drift, which a purely
// behavioral test importing the component directly cannot catch on its own
// (it would still pass even if App.tsx stopped using this component for
// these routes).
describe('App.tsx wiring (secondary — see the behavioral tests above for the real proof)', () => {
  const APP_SOURCE = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf-8');

  it.each(LEGACY_PATHS)('%s is wired to RedirectPreservingQuery', (path) => {
    const escaped = path.replace(/\//g, '\\/');
    const routeRe = new RegExp(
      `<Route path="${escaped}" element=\\{<RedirectPreservingQuery to="/dashboard/shop" />\\} />`,
    );
    expect(APP_SOURCE, `expected ${path} wired to RedirectPreservingQuery`).toMatch(routeRe);
  });

  it('/dashboard/shop is still the one live route that renders ProductManagement', () => {
    const idx = APP_SOURCE.indexOf('path="/dashboard/shop"');
    expect(idx).toBeGreaterThan(-1);
    const chunk = APP_SOURCE.slice(idx, idx + 800);
    expect(chunk).toContain('<ProductManagement');
  });
});
