import { describe, it, expect } from 'vitest';
import { NAV_CATALOG, resolveNav, entrySurfaces, hideableNavItems, type NavContext } from '../navCatalog';

const openCtx = (over: Partial<NavContext> = {}): NavContext => ({
  hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true,
  canLibrarian: true, isPartner: true, hiddenRoutes: new Set(), ...over,
});

describe('NAV_CATALOG integrity', () => {
  it('keys are unique', () => {
    const keys = NAV_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('frozen grid keys keep their exact routes and grid labels', () => {
    const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
    const frozen: Array<[string, string, string]> = [
      ['music', '/dashboard/viewer', 'Music'],
      ['studio', '/studio', 'Studio'],
      ['sight', '/dashboard/reading-music', 'Reading Music'],
      ['attendance', '/attendance', 'Attendance'],
      ['academy', '/dashboard/academy', 'Academy'],
      ['tickets', '/box-office', 'Tickets'],
      ['planner', '/dashboard/concert-planner', 'Programs'],
      ['finance', '/dashboard/finance', 'Finance'],
    ];
    for (const [key, to, gridLabel] of frozen) {
      const e = byKey.get(key);
      expect(e, key).toBeDefined();
      expect(e!.to).toBe(to);
      expect(e!.gridLabel ?? e!.label).toBe(gridLabel);
    }
  });
  it('merch was retired into shop (Phase 5 consolidation) — key no longer in the catalog', () => {
    expect(NAV_CATALOG.find((e) => e.key === 'merch')).toBeUndefined();
  });
});

describe('resolveNav gates', () => {
  it('open context resolves every entry', () => {
    expect(resolveNav(openCtx()).length).toBe(NAV_CATALOG.length);
  });
  it('module gate drops entries whose module is off', () => {
    const out = resolveNav(openCtx({ hasModule: (k) => k !== 'pr_hub' }));
    expect(out.find((e) => e.key === 'pr-hub')).toBeUndefined();
    expect(out.find((e) => e.key === 'feeds')).toBeDefined();
  });
  it('box_office module off hides both the admin Box Office entry and the grid Tickets tile', () => {
    const out = resolveNav(openCtx({ hasModule: (k) => k !== 'box_office' }));
    expect(out.find((e) => e.key === 'box-office')).toBeUndefined();
    expect(out.find((e) => e.key === 'tickets')).toBeUndefined();
  });
  it('moduleAny keeps Store when either merch or store is on', () => {
    const only = (on: string) => openCtx({ hasModule: (k) => k === on });
    expect(resolveNav(only('merch')).find((e) => e.key === 'shop')).toBeDefined();
    expect(resolveNav(only('store')).find((e) => e.key === 'shop')).toBeDefined();
    expect(resolveNav(openCtx({ hasModule: () => false })).find((e) => e.key === 'shop')).toBeUndefined();
  });
  it('adminOnly entries hidden from non-admins', () => {
    const out = resolveNav(openCtx({ isTenantAdmin: false }));
    for (const key of ['practice', 'fan-page', 'box-office', 'site-setup', 'shop']) {
      expect(out.find((e) => e.key === key), key).toBeUndefined();
    }
  });
  it('shop is offered to an admin in a module-enabled tenant, hidden from a non-admin in the same tenant', () => {
    const moduleOn = (ctx: Partial<NavContext>) => openCtx({ hasModule: (k) => k === 'merch' || k === 'store', ...ctx });
    expect(resolveNav(moduleOn({ isTenantAdmin: true })).find((e) => e.key === 'shop')).toBeDefined();
    expect(resolveNav(moduleOn({ isTenantAdmin: false })).find((e) => e.key === 'shop')).toBeUndefined();
  });
  it('platformAdminOnly hides Tenants from tenant admins', () => {
    expect(resolveNav(openCtx({ isPlatformAdmin: false })).find((e) => e.key === 'tenants')).toBeUndefined();
  });
  it('librarianOnly requires both module and permission', () => {
    expect(resolveNav(openCtx({ canLibrarian: false })).find((e) => e.key === 'librarian')).toBeUndefined();
    expect(resolveNav(openCtx({ hasModule: (k) => k !== 'librarian' })).find((e) => e.key === 'librarian')).toBeUndefined();
  });
  it('hiddenRoutes filters by route', () => {
    const out = resolveNav(openCtx({ hiddenRoutes: new Set(['/dashboard/pr-hub']) }));
    expect(out.find((e) => e.to === '/dashboard/pr-hub')).toBeUndefined();
  });
  it('flagless core (Music Library, People, Video) survives an all-off context', () => {
    const out = resolveNav({ hasModule: () => false, isTenantAdmin: true, isPlatformAdmin: false, canLibrarian: false, isPartner: false, hiddenRoutes: new Set() });
    for (const key of ['music-library', 'people', 'video', 'music-tools', 'office-hours', 'analytics', 'settings', 'attendance', 'academy']) {
      expect(out.find((e) => e.key === key), key).toBeDefined();
    }
  });
});

describe('entrySurfaces', () => {
  it('attendance is grid-only; Command Center/Messenger/Calendar are sidebar-only', () => {
    const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
    expect(entrySurfaces(byKey.get('attendance')!)).toEqual(['grid']);
    for (const key of ['home', 'messages', 'calendar']) {
      expect(entrySurfaces(byKey.get(key)!)).toEqual(['sidebar']);
    }
    expect(entrySurfaces(byKey.get('pr-hub')!)).toEqual(['sidebar', 'grid']);
  });
});

describe('hideableNavItems (Workspace Settings source)', () => {
  const items = hideableNavItems();
  it('every item derives from a catalog entry (no drift possible)', () => {
    const routes = new Set(NAV_CATALOG.map((e) => e.to));
    for (const it of items) expect(routes.has(it.path), it.path).toBe(true);
  });
  it('fixes the legacy list: Tour Manager and Liturgy Planner use their REAL routes', () => {
    const paths = items.map((i) => i.path);
    expect(paths).toContain('/tour-manager');
    expect(paths).toContain('/dashboard/liturgy');
    // The legacy hand-maintained paths that silently never matched:
    for (const dead of ['/dashboard/tour', '/dashboard/liturgy-planner', '/dashboard/inbox', '/dashboard/schedule', '/dashboard/attendance']) {
      expect(paths, dead).not.toContain(dead);
    }
  });
  it('excludes platform-admin-only entries (Tenants)', () => {
    expect(items.find((i) => i.path === '/admin/tenants')).toBeUndefined();
  });
  it('includes grid-only tiles so admins can hide them from the home grid', () => {
    const paths = items.map((i) => i.path);
    for (const p of ['/attendance', '/box-office']) expect(paths, p).toContain(p);
  });
  it('paths are unique and every item has a section label', () => {
    expect(new Set(items.map((i) => i.path)).size).toBe(items.length);
    for (const it of items) expect(it.section.length, it.path).toBeGreaterThan(0);
  });
});
