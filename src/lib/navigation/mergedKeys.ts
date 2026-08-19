// Retired catalog keys → their surviving successor.
//
// Lives in its own module rather than myTools.ts (where it started) because
// a second consumer needed it and myTools.ts wasn't importable from there
// without creating a cycle: myTools.ts already imports parseTileLayout from
// appDestinations.ts, and appDestinations.ts's getAppTiles needs this
// resolver too (My Tools drives both the sidebar shelf AND the home
// keycap grid — see the fix note on getAppTiles). Both modules import this
// one instead; neither imports the other.
//
// The resolver exists from day one so that when a catalog entry merges into
// another, no stored member layout has to be rewritten — resolution happens
// wherever a stored key is READ, not at write time. NEVER rename a
// CatalogEntry.key; retire it here instead.
//
// 'merch' retired 2026-08-09: it and 'shop' both pointed at the same
// ProductManagement component (Phase 5 catalog recut, §4) — 'shop's
// moduleAny: ['merch', 'store'] gate already covers everything 'merch'
// gated on, so no tenant loses access.
export const MERGED_KEYS: Record<string, string> = {
  merch: 'shop',
};

/**
 * Follow `map` until the key is unmapped. Cycle-safe: before following a
 * hop, checks whether the destination has already been visited in this
 * walk; if so, stops and returns the current key rather than re-entering
 * the cycle. A hand-edited or mistakenly circular map degrades to a
 * stale-but-finite answer instead of hanging the render.
 */
export function resolveKey(key: string, map: Record<string, string> = MERGED_KEYS): string {
  const seen = new Set<string>([key]);
  let k = key;
  while (map[k] !== undefined) {
    const next = map[k];
    if (seen.has(next)) return k;
    seen.add(next);
    k = next;
  }
  return k;
}

/**
 * Resolve every key in `keys`, then dedupe on the RESOLVED value, keeping
 * first occurrence — the same "resolve, then dedupe" order `sanitizeTools`
 * (myTools.ts) uses, minus its MY_TOOLS_SANITY_MAX bound: that bound governs what may
 * be STORED, not how many already-stored entries a render path may show.
 *
 * Shared by selectShelfEntries (the sidebar shelf) and getAppTiles's My
 * Tools path (the home keycap grid) so a record saved BEFORE a merge
 * shipped — one that legitimately has both the retired key and its
 * successor, from back when they were two separate live catalog entries a
 * member could pin independently ('merch' and 'shop' both existed until
 * 2026-08-09) — renders as ONE tile on both surfaces, not two. A bare
 * `.map(resolveKey)` with no dedup step would resolve both to the same
 * entry and render it twice.
 */
export function resolveKeys(keys: string[], map: Record<string, string> = MERGED_KEYS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const r = resolveKey(k, map);
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}
