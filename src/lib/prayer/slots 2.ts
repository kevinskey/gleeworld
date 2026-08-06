/**
 * Canonical Mass reading slots, shared by every readings source so that rows
 * from different providers sort identically in gw_prayer_readings.
 *
 * Phase 0 imports the calendar from LitCal and the reading citations from
 * catholic-readings-api; those two use different key names for the same slots,
 * and this module is the single place that decides the vocabulary and order.
 */

export interface NormalizedReading {
  slot: string;
  citation: string;
  schemaLabel: string;
  sortOrder: number;
  source: string;
}

/** Liturgical order. Slots outside this list sort after it, in arrival order. */
export const SLOT_ORDER = [
  'first_reading',
  'responsorial_psalm',
  'second_reading',
  'gospel_acclamation',
  'gospel',
];

/**
 * Stable sort by liturgical order: known slots first in SLOT_ORDER sequence,
 * unknown slots after, preserving the order the provider returned them. Keeps
 * rare Easter Vigil / Pentecost Vigil slots rather than dropping them.
 */
export function compareSlots(a: string, b: string): number {
  const ia = SLOT_ORDER.indexOf(a);
  const ib = SLOT_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return 0;
}
