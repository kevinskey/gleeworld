// The superadmin API's GET /stats returns a nested object whose shape is
// server-defined and may grow; render only scalar entries (one level of
// nesting), like the static /superadmin/ console did. Keys ending in
// `_cents` render as currency via formatPrice (see planTiers.ts).
import { formatPrice } from './planTiers';

export interface PlatformStat {
  label: string;
  value: string;
}

// The tile renders labels with a `capitalize` class, which title-cases the
// first letter of each word but leaves the rest alone — so acronyms need to
// already be uppercase going in, or "revenue mrr" renders as "Revenue Mrr"
// instead of "Revenue MRR". Applied after underscore-to-space conversion,
// on whole words only, so it can't clobber a longer word that merely
// contains "mrr"/"arr" as a substring.
function uppercaseAcronyms(label: string): string {
  return label.replace(/\b(mrr|arr)\b/gi, (m) => m.toUpperCase());
}

export function formatPlatformStats(raw: unknown): PlatformStat[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const stats: PlatformStat[] = [];

  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === 'number' || typeof v === 'string') {
      // Top-level scalar: render directly.
      const isCents = typeof v === 'number' && k.endsWith('_cents');
      stats.push({
        label: uppercaseAcronyms(k.replace(/_/g, ' ').replace(/ cents$/, '')),
        value: isCents ? formatPrice(v) : String(v),
      });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // One level of nesting: hoist scalar children with combined label.
      Object.entries(v as Record<string, unknown>).forEach(([childKey, childVal]) => {
        if (typeof childVal === 'number' || typeof childVal === 'string') {
          const isCents = typeof childVal === 'number' && childKey.endsWith('_cents');
          stats.push({
            label: uppercaseAcronyms(`${k} ${childKey}`.replace(/_/g, ' ').replace(/ cents$/, '')),
            value: isCents ? formatPrice(childVal) : String(childVal),
          });
        }
      });
    }
  });

  return stats;
}
