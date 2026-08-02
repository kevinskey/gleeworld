// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mutable hook state, driven per test.
let roleState: { profile: unknown; loading: boolean } = { profile: null, loading: true };
let modulesState: { data: Array<{ module_id: string }>; isLoading: boolean } = { data: [], isLoading: true };

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => roleState,
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useTenantModules: () => modulesState,
}));

import { MobileBottomNav } from './MobileBottomNav';

// A tenant with both the viewer (Music) and studio add-ons active.
const VIEWER_AND_STUDIO = [{ module_id: 'viewer' }, { module_id: 'studio' }];

const renderNav = (path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>,
  );

beforeEach(() => {
  // useIsCompactNav reads window.innerWidth (< 768 = compact nav) and matchMedia.
  window.innerWidth = 390;
  window.matchMedia = ((query: string) => ({
    matches: true, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  roleState = { profile: null, loading: true };
  modulesState = { data: [], isLoading: true };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('MobileBottomNav — no icon flash while data loads', () => {
  it('does not render Studio while the profile role is still loading (modules already loaded)', () => {
    // Faculty user whose profile has not resolved yet, but the tenant module
    // list HAS landed. isFacultyProfile(null) === false would pick the student
    // order (which includes Studio) — the transient tab that flashes before the
    // faculty order (Music) replaces it. The loading guard must suppress it.
    roleState = { profile: null, loading: true };
    modulesState = { data: VIEWER_AND_STUDIO, isLoading: false };

    renderNav();

    // Only the role-agnostic core tabs should be present during loading.
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Messages')).toBeInTheDocument();
    expect(screen.getByLabelText('Calendar')).toBeInTheDocument();
    // The Studio tab must NOT flash in before the role is known.
    expect(screen.queryByLabelText('Studio')).not.toBeInTheDocument();
  });

  it('shows Music (not Studio) for a resolved faculty user', () => {
    // Faculty (admin) order is [Roster, Music]; Studio is student-only.
    roleState = { profile: { role: 'director', is_admin: true }, loading: false };
    modulesState = { data: VIEWER_AND_STUDIO, isLoading: false };

    renderNav();

    expect(screen.getByLabelText('Music')).toBeInTheDocument();
    expect(screen.queryByLabelText('Studio')).not.toBeInTheDocument();
  });

  it('renders only core tabs while modules are still loading', () => {
    roleState = { profile: { role: 'member' }, loading: false };
    modulesState = { data: [], isLoading: true };

    renderNav();

    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Messages')).toBeInTheDocument();
    expect(screen.getByLabelText('Calendar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Studio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Music')).not.toBeInTheDocument();
  });
});
