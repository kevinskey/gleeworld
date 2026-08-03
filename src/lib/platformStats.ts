// The superadmin API's GET /stats returns a nested object whose shape is
// server-defined and may grow; render only scalar entries (one level of
// nesting), like the static /superadmin/ console did. Keys ending in
// `_cents` render as currency via formatPrice (see planTiers.ts).
import { formatPrice } from './planTiers';

export interface PlatformStat {
  label: string;
  value: string;
}

export function formatPlatformStats(raw: unknown): PlatformStat[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const stats: PlatformStat[] = [];

  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === 'number' || typeof v === 'string') {
      // Top-level scalar: render directly.
      const isCents = typeof v === 'number' && k.endsWith('_cents');
      stats.push({
        label: k.replace(/_/g, ' ').replace(/ cents$/, ''),
        value: isCents ? formatPrice(v) : String(v),
      });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // One level of nesting: hoist scalar children with combined label.
      Object.entries(v as Record<string, unknown>).forEach(([childKey, childVal]) => {
        if (typeof childVal === 'number' || typeof childVal === 'string') {
          const isCents = typeof childVal === 'number' && childKey.endsWith('_cents');
          stats.push({
            label: `${k} ${childKey}`.replace(/_/g, ' ').replace(/ cents$/, ''),
            value: isCents ? formatPrice(childVal) : String(childVal),
          });
        }
      });
    }
  });

  return stats;
}
