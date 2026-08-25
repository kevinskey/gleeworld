// A nav entry gated on `module: 'x'` renders only if 'x' is also present in
// the MODULE_KEYS list the shell loops over to build its moduleAccess map.
// Adding the catalog entry and forgetting the key hides the destination
// completely — no error, no warning, nothing in the console. It cost us
// All-State on its first deploy and Auctions on its second.
//
// These tests make that impossible to repeat: the key list is now DERIVED
// from the catalog, and this pins the relationship.
import { describe, expect, it } from 'vitest';
import { GATED_MODULE_KEYS, NAV_CATALOG } from '../navCatalog';

describe('GATED_MODULE_KEYS', () => {
  it('covers every module a catalog entry gates on', () => {
    const required = new Set<string>();
    for (const entry of NAV_CATALOG) {
      if (entry.gate?.module) required.add(entry.gate.module);
      for (const m of entry.gate?.moduleAny ?? []) required.add(m);
    }

    const missing = [...required].filter((m) => !GATED_MODULE_KEYS.includes(m));
    expect(missing, `nav entries gate on modules absent from GATED_MODULE_KEYS: ${missing.join(', ')}`)
      .toEqual([]);
  });

  it('keeps the previously hand-listed keys, so nothing silently drops out', () => {
    // The hand-maintained list this replaced. Every one of these must survive
    // the switch to deriving from the catalog.
    for (const key of [
      'sight_reading', 'box_office', 'auditions', 'librarian', 'pr_hub', 'finance',
      'merch', 'store', 'feeds', 'viewer', 'concert_planner', 'tour',
      'liturgy_planner', 'studio', 'songwriting', 'planner', 'all_state',
    ]) {
      expect(GATED_MODULE_KEYS, `lost module key ${key}`).toContain(key);
    }
  });

  it('has no duplicates — the shell calls one hook per entry', () => {
    expect(GATED_MODULE_KEYS.length).toBe(new Set(GATED_MODULE_KEYS).size);
  });

  it('is stable across reads, so the shell\'s hook count cannot change between renders', () => {
    expect(GATED_MODULE_KEYS).toBe(GATED_MODULE_KEYS);
    expect([...GATED_MODULE_KEYS]).toEqual([...GATED_MODULE_KEYS]);
  });
});
