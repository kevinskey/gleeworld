/** Credit a given attendance status earns toward a stipend, 0..1. */
export type StatusWeights = Record<string, number>;

export type Rounding = 'cent' | 'dollar';

/**
 * Tenant-editable defaults. `tardy` and `late` both appear in existing
 * attendance data and mean the same thing.
 */
export const DEFAULT_STATUS_WEIGHTS: StatusWeights = {
  present: 1,
  late: 0.5,
  tardy: 0.5,
  excused: 1,
  absent: 0,
};

/**
 * Returns the weight for a status, or null when the status is not in the
 * map. Null is deliberately distinct from 0: an unmapped status is a
 * configuration problem to surface, not a silent deduction.
 */
export function weightFor(status: string, weights: StatusWeights): number | null {
  const w = weights[status];
  return typeof w === 'number' && Number.isFinite(w) ? w : null;
}
