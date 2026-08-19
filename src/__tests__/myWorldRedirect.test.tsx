// @vitest-environment jsdom
//
// "My Space" was renamed "My World" on 2026-08-09 (product owner's call).
// The page moved from /dashboard/my-space to /dashboard/my-world, so every
// bookmark, in-app deep link and product-tour target aimed at the old path
// has to keep working — it redirects rather than 404s.
//
// Same shape and same rationale as legacyStoreRedirects.test.tsx (read its
// header): this mounts the REAL RedirectPreservingQuery in a real
// MemoryRouter/Routes tree rather than grepping App.tsx, because a source
// scan stays green even when the router semantics change — and it is
// exactly how the "a bare <Navigate> silently drops ?search and #hash" bug
// slipped through the first time. RedirectPreservingQuery is deliberately
// REUSED here rather than reimplemented: it already solves this.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RedirectPreservingQuery } from '../components/routing/RedirectPreservingQuery';

function LandedProbe() {
  const loc = useLocation();
  return <div data-testid="landed">{loc.pathname}{loc.search}{loc.hash}</div>;
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard/my-space" element={<RedirectPreservingQuery to="/dashboard/my-world" />} />
        <Route path="/dashboard/my-world" element={<LandedProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('/dashboard/my-space redirects to /dashboard/my-world', () => {
  // EXACT text, not a substring: jest-dom's toHaveTextContent with a string
  // is a substring match, so '/dashboard/my-world' would pass against a
  // landed '/dashboard/my-world-something'. Destinations get anchors.
  it('lands on the new path', () => {
    renderAt('/dashboard/my-space');
    expect(screen.getByTestId('landed')).toHaveTextContent(/^\/dashboard\/my-world$/);
  });

  it('preserves a query string across the redirect', () => {
    renderAt('/dashboard/my-space?tab=defaults');
    expect(screen.getByTestId('landed')).toHaveTextContent(/^\/dashboard\/my-world\?tab=defaults$/);
  });

  it('preserves a hash across the redirect', () => {
    renderAt('/dashboard/my-space#widgets');
    expect(screen.getByTestId('landed')).toHaveTextContent(/^\/dashboard\/my-world#widgets$/);
  });

  it('preserves BOTH a query string and a hash together', () => {
    renderAt('/dashboard/my-space?tab=defaults#widgets');
    expect(screen.getByTestId('landed')).toHaveTextContent(/^\/dashboard\/my-world\?tab=defaults#widgets$/);
  });
});

// Secondary, narrow wiring check — see legacyStoreRedirects.test.tsx's
// equivalent block for why this is NOT the primary proof: the behavioral
// tests above import the component directly, so they would stay green even
// if App.tsx stopped using it for this route. This catches that drift.
describe('App.tsx wiring (secondary — the behavioral tests above are the real proof)', () => {
  const APP_SOURCE = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf-8');

  it('wires /dashboard/my-space to RedirectPreservingQuery, not a bare <Navigate>', () => {
    expect(APP_SOURCE).toMatch(
      /<Route path="\/dashboard\/my-space" element=\{<RedirectPreservingQuery to="\/dashboard\/my-world" \/>\} \/>/,
    );
  });

  it('/dashboard/my-world is the live route that renders MyWorldPage', () => {
    const idx = APP_SOURCE.indexOf('path="/dashboard/my-world"');
    expect(idx).toBeGreaterThan(-1);
    expect(APP_SOURCE.slice(idx, idx + 800)).toContain('<MyWorldPage');
  });

  it('no route still renders the old MySpacePage', () => {
    expect(APP_SOURCE).not.toContain('MySpacePage');
  });
});
