// Pure orchestra chair operations.
// - isOrchestraArrangement: detect string sections on the current chart
// - autoNumberChairs: chair_number in row-major order per string section
// - rotateStrings: swap 1↔2, 3↔4, … within each string section (stand rotation)
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

export const ORCHESTRA_SECTIONS = ['violin1', 'violin2', 'viola', 'cello', 'bass_v'] as const;
export type OrchestraSection = typeof ORCHESTRA_SECTIONS[number];

export function isOrchestraArrangement(objects: SeatingObject[]): boolean {
  return objects.some((o) => (ORCHESTRA_SECTIONS as readonly string[]).includes(o.subtype ?? ''));
}

function seatsInSection(objects: SeatingObject[], section: OrchestraSection): SeatingObject[] {
  return objects
    .filter((o) => o.subtype === section && o.object_type === 'chair')
    .slice()
    .sort((a, b) => {
      if (Math.abs(Number(a.y) - Number(b.y)) < 30) return Number(a.x) - Number(b.x);
      return Number(a.y) - Number(b.y);
    });
}

export interface ChairNumberPatch {
  assignmentId: string;
  chair_number: number;
}

/**
 * Assign chair_number in row-major seat order per string section.
 * Only patches assignments that actually have a profile_id (empty seats
 * don't get numbered). Returns the list of patches for the caller.
 */
export function autoNumberChairs(
  objects: SeatingObject[],
  assignments: SeatingAssignment[],
): ChairNumberPatch[] {
  const asnByObject = new Map(assignments.map((a) => [a.chart_object_id, a] as const));
  const patches: ChairNumberPatch[] = [];
  for (const section of ORCHESTRA_SECTIONS) {
    const seats = seatsInSection(objects, section);
    let n = 1;
    for (const seat of seats) {
      const a = asnByObject.get(seat.id);
      if (!a || !a.profile_id) continue;
      if (a.chair_number !== n) patches.push({ assignmentId: a.id, chair_number: n });
      n += 1;
    }
  }
  return patches;
}

export interface AssignmentSwap {
  aId: string;
  bId: string;
  aChartObjectId: string;
  bChartObjectId: string;
}

/**
 * Return a list of pairs to swap (1↔2, 3↔4, …) within each string section.
 * Swapping is done on chart_object_id, keeping chair numbers the same so
 * "principal" (chair 1) always denotes the leader position, not a person.
 */
export function rotateStrings(
  objects: SeatingObject[],
  assignments: SeatingAssignment[],
): AssignmentSwap[] {
  const asnByObject = new Map(assignments.map((a) => [a.chart_object_id, a] as const));
  const swaps: AssignmentSwap[] = [];
  for (const section of ORCHESTRA_SECTIONS) {
    const seats = seatsInSection(objects, section);
    for (let i = 0; i + 1 < seats.length; i += 2) {
      const a = asnByObject.get(seats[i].id);
      const b = asnByObject.get(seats[i + 1].id);
      if (!a || !b) continue;
      swaps.push({
        aId: a.id, bId: b.id,
        aChartObjectId: seats[i].id, bChartObjectId: seats[i + 1].id,
      });
    }
  }
  return swaps;
}
