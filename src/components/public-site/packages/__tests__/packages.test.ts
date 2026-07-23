// Validation tests for the site template packages. Catches shape drift
// between packages and the block registry BEFORE Pick a look surfaces it
// as a runtime error toast to the tenant.

import { describe, it, expect } from 'vitest';
import { PACKAGE_LIST, PACKAGE_REGISTRY, getPackage } from '../index';
import { getBlockModule } from '../../registry';
import { themeSchema } from '../../types';

describe('template packages', () => {
  it('registry exposes exactly modern, institutional, minimalist', () => {
    expect(Object.keys(PACKAGE_REGISTRY).sort()).toEqual(
      ['institutional', 'minimalist', 'modern'],
    );
  });

  it('getPackage returns undefined for unknown ids', () => {
    expect(getPackage('brutalist')).toBeUndefined();
  });

  it('no shipping package is marked coming soon', () => {
    // Everything in PACKAGE_LIST should be selectable. If we intentionally
    // ship a WIP package, this test forces us to flip comingSoon off first.
    for (const pkg of PACKAGE_LIST) {
      expect(pkg.comingSoon, `${pkg.id} still marked comingSoon`).toBeFalsy();
    }
  });

  it.each(PACKAGE_LIST.map((pkg) => [pkg.id, pkg] as const))(
    '%s has valid theme tokens',
    (_id, pkg) => {
      // themeSchema.parse throws if any token is unknown. We merge
      // package.theme onto the schema's defaults so partial themes still
      // validate (packages only override what they care about).
      const merged = { ...themeSchema.parse({}), ...pkg.theme };
      expect(() => themeSchema.parse(merged)).not.toThrow();
    },
  );

  it.each(PACKAGE_LIST.map((pkg) => [pkg.id, pkg] as const))(
    '%s: every seeded block type is registered',
    (_id, pkg) => {
      for (const block of pkg.blocks) {
        const mod = getBlockModule(block.type);
        expect(mod, `unknown block type "${block.type}" in ${pkg.id}`).toBeDefined();
      }
    },
  );

  it.each(PACKAGE_LIST.map((pkg) => [pkg.id, pkg] as const))(
    '%s: every block config parses against its schema',
    (_id, pkg) => {
      for (const block of pkg.blocks) {
        const mod = getBlockModule(block.type)!;
        // Same shape the site editor uses when seeding a block: start
        // with the module's defaults, layer the package overrides on top.
        const merged = { ...mod.defaultConfig, ...(block.config ?? {}) };
        const result = mod.configSchema.safeParse(merged);
        expect(
          result.success,
          result.success ? '' : `block ${block.type} in ${pkg.id} failed: ${JSON.stringify(result.error.issues)}`,
        ).toBe(true);
      }
    },
  );

  it('modern seeds hero first and terminates with contact', () => {
    // Sanity: the picker's applyPackage relies on the header being
    // injected as position 0, so the package's own blocks[0] should be
    // the hero, not another header. Also, every package should end on
    // a contact block so tenants have a place to receive email/phone
    // right after adopting the look.
    const mod = getPackage('modern')!;
    expect(mod.blocks[0].type).toBe('hero');
    expect(mod.blocks[mod.blocks.length - 1].type).toBe('contact');
  });

  it('institutional seeds hero first and terminates with contact', () => {
    const inst = getPackage('institutional')!;
    expect(inst.blocks[0].type).toBe('hero');
    expect(inst.blocks[inst.blocks.length - 1].type).toBe('contact');
  });

  it('minimalist seeds hero first and terminates with contact', () => {
    const min = getPackage('minimalist')!;
    expect(min.blocks[0].type).toBe('hero');
    expect(min.blocks[min.blocks.length - 1].type).toBe('contact');
  });

  it('minimalist is the sparsest package (fewest blocks)', () => {
    // Editorial density is the whole point of the minimalist look.
    // Guards against someone piling blocks onto it.
    const min = getPackage('minimalist')!;
    const modern = getPackage('modern')!;
    const inst = getPackage('institutional')!;
    expect(min.blocks.length).toBeLessThan(modern.blocks.length);
    expect(min.blocks.length).toBeLessThan(inst.blocks.length);
  });
});
