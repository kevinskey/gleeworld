// The Auctions nav entry has to agree with the module id used by ModuleGate,
// the billing catalog row, and toModuleFlags. These are three separate files
// that drift silently, so pin them together.
import { describe, expect, it } from 'vitest';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { toModuleFlags, toModuleSet } from '@/lib/navigation/moduleFlags';

const MODULE_ID = 'auctions';

describe('auctions nav wiring', () => {
  const entry = NAV_CATALOG.find((e) => e.key === MODULE_ID);

  it('is registered in the nav catalog', () => {
    expect(entry).toBeDefined();
  });

  it('points at the calendar route, not the admin page', () => {
    expect(entry?.to).toBe('/auctions');
  });

  it('is gated on the same module id the route and billing row use', () => {
    expect(entry?.gate).toEqual({ module: MODULE_ID });
  });

  it('is labelled for the sidebar', () => {
    expect(entry?.label).toBe('Auctions');
  });

  it('derives its module flag from the tenant module list', () => {
    const modules = [{ module_id: MODULE_ID }] as never;
    expect(toModuleFlags(modules).hasAuctions).toBe(true);
    expect(toModuleSet(modules).has(MODULE_ID)).toBe(true);
  });

  it('reports the flag off when the tenant does not have the module', () => {
    expect(toModuleFlags([] as never).hasAuctions).toBe(false);
  });
});
