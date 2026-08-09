// Matching and ranking for the All Tools sheet. Pure and catalog-shaped so
// it can be tested without a DOM, and passed to cmdk as its custom filter so
// keyboard navigation stays cmdk's job and ranking stays ours.
//
// Callers MUST pass an already-gated entry list (resolveNav output). This
// module does no gating and must never be handed NAV_CATALOG raw.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.3
import { NAV_SECTION_LABELS, type CatalogEntry } from './navCatalog';

/** Lowercase + strip diacritics, so "Répertoire" matches "repertoire". */
export function normalize(s: string): string {
  // \u0300-\u036f is the combining-diacritical-marks block. Write it as an
  // escape, never as literal combining characters — those are invisible in
  // most editors and survive a copy-paste as mojibake.
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function scoreEntry(entry: CatalogEntry, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const label = normalize(entry.label);
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  const section = normalize(NAV_SECTION_LABELS[entry.section] ?? '');
  if (section.startsWith(q) || section.includes(q)) return 20;
  return 0;
}

/**
 * Matching entries, best first. An empty query returns `entries` unchanged
 * (same array contents and order) so the sheet's default view is plain
 * catalog order rather than an arbitrary ranking.
 *
 * Ties break on the caller's original order via a decorated sort — Array
 * .sort is not guaranteed stable across every engine we ship to, so index is
 * carried explicitly rather than assumed.
 */
export function searchNav(entries: CatalogEntry[], query: string): CatalogEntry[] {
  if (!normalize(query)) return entries;
  return entries
    .map((entry, index) => ({ entry, index, score: scoreEntry(entry, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((r) => r.entry);
}
