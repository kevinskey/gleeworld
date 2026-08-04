// Pure placement algorithms. Each takes the current chart state + a person
// pool and returns proposed assignments. Never mutates input. Locked
// objects/assignments are preserved.
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';
import { newDbId, isUuid } from '../ids';

export type PlacementRule =
  | 'alphabetical'
  | 'random'
  | 'group_by_section'
  | 'keep_together'
  | 'separate'
  | 'height_order'
  | 'front_row_priority'
  | 'accessibility_priority';

export interface PlacementInput {
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  people: SeatingPerson[];
  arrangementId: string;
  tenantId: string;
  /** Ids of people whose assignments must NOT be reshuffled. */
  lockedPersonIds?: Set<string>;
  /** For keep_together / separate: person id pairs (or groups). */
  groups?: string[][];
  /** For group_by_section: mapping person → section key that ranks by section. */
  personSection?: Map<string, string>;
  /** For height_order: mapping person → cm height. */
  personHeight?: Map<string, number>;
}

export interface PlacementResult {
  assignments: SeatingAssignment[];
  unassigned: SeatingPerson[];
  message: string;
}

// Only these object types can hold a person.
const SEAT_TYPES: SeatingObject['object_type'][] = ['seat', 'chair', 'riser_slot', 'desk'];

function nowIso() { return new Date().toISOString(); }

function seatObjects(objects: SeatingObject[]): SeatingObject[] {
  return objects.filter((o) => SEAT_TYPES.includes(o.object_type) && !o.locked);
}

// Iteration order for seats: row-major top→bottom, left→right within row.
function sortedSeats(seats: SeatingObject[]): SeatingObject[] {
  return seats.slice().sort((a, b) => {
    if (Math.abs(Number(a.y) - Number(b.y)) < 30) return Number(a.x) - Number(b.x);
    return Number(a.y) - Number(b.y);
  });
}

function buildAssignment(
  seat: SeatingObject,
  person: SeatingPerson,
  input: PlacementInput,
  existing?: SeatingAssignment,
): SeatingAssignment {
  // Imported guests have synthetic ids; only real user uuids may go in profile_id.
  const isRealUser = isUuid(person.user_id);
  return {
    id: existing?.id ?? newDbId(),
    tenant_id: input.tenantId,
    arrangement_id: input.arrangementId,
    chart_object_id: seat.id,
    profile_id: isRealUser ? person.user_id : null,
    external_person_id: isRealUser ? null : person.user_id,
    display_name: person.full_name,
    section: existing?.section ?? null,
    voice_part: person.voice_part ?? existing?.voice_part ?? null,
    instrument: existing?.instrument ?? null,
    chair_number: existing?.chair_number ?? null,
    assignment_status: 'assigned',
    properties: existing?.properties ?? {},
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
}

// Common core: given an already-ordered people list + open seats, pair them.
function pairPeopleToSeats(
  peopleOrdered: SeatingPerson[],
  input: PlacementInput,
): PlacementResult {
  const seats = sortedSeats(seatObjects(input.objects));
  const locked = new Set([...(input.lockedPersonIds ?? [])]);
  const existingByObj = new Map(input.assignments.map((a) => [a.chart_object_id, a] as const));

  // Which seats are locked by an unchangeable person?
  const lockedSeatIds = new Set<string>();
  input.assignments.forEach((a) => {
    if (a.profile_id && locked.has(a.profile_id)) lockedSeatIds.add(a.chart_object_id);
  });

  const availableSeats = seats.filter((s) => !lockedSeatIds.has(s.id));
  const availablePeople = peopleOrdered.filter((p) => !locked.has(p.user_id));

  const nextAssignments: SeatingAssignment[] = [];
  const takenPersonIds = new Set<string>();
  for (let i = 0; i < availableSeats.length && i < availablePeople.length; i++) {
    const seat = availableSeats[i];
    const person = availablePeople[i];
    nextAssignments.push(buildAssignment(seat, person, input, existingByObj.get(seat.id)));
    takenPersonIds.add(person.user_id);
  }

  const unassigned = availablePeople.filter((p) => !takenPersonIds.has(p.user_id));
  const message = unassigned.length > 0
    ? `Placed ${nextAssignments.length} people; ${unassigned.length} left unassigned (not enough seats).`
    : `Placed all ${nextAssignments.length} people.`;

  return { assignments: nextAssignments, unassigned, message };
}

export function alphabetical(input: PlacementInput): PlacementResult {
  const sorted = input.people.slice().sort((a, b) =>
    (a.full_name ?? '').localeCompare(b.full_name ?? ''),
  );
  return pairPeopleToSeats(sorted, input);
}

export function random(input: PlacementInput): PlacementResult {
  const shuffled = input.people.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return pairPeopleToSeats(shuffled, input);
}

export function groupBySection(input: PlacementInput): PlacementResult {
  const bySection = input.people.slice().sort((a, b) => {
    const sa = input.personSection?.get(a.user_id) ?? a.voice_part ?? '';
    const sb = input.personSection?.get(b.user_id) ?? b.voice_part ?? '';
    if (sa === sb) return (a.full_name ?? '').localeCompare(b.full_name ?? '');
    return sa.localeCompare(sb);
  });
  return pairPeopleToSeats(bySection, input);
}

export function heightOrder(input: PlacementInput): PlacementResult {
  const byHeight = input.people.slice().sort((a, b) => {
    const ha = input.personHeight?.get(a.user_id) ?? 0;
    const hb = input.personHeight?.get(b.user_id) ?? 0;
    // Tallest go to the back → back rows have higher y (top-of-stage in our
    // coord system is lower y). We iterate seats in row-major sortedSeats
    // order (top first), so tallest come FIRST in the people list to land in
    // the highest riser row.
    if (hb !== ha) return hb - ha;
    return (a.full_name ?? '').localeCompare(b.full_name ?? '');
  });
  return pairPeopleToSeats(byHeight, input);
}

export function keepTogether(input: PlacementInput): PlacementResult {
  // Sort so grouped people are adjacent in the output; other people fill the
  // remaining slots in alphabetical order.
  const groupSet = new Set(input.groups?.flat() ?? []);
  const grouped: SeatingPerson[] = [];
  for (const group of input.groups ?? []) {
    for (const id of group) {
      const p = input.people.find((x) => x.user_id === id);
      if (p) grouped.push(p);
    }
  }
  const ungrouped = input.people
    .filter((p) => !groupSet.has(p.user_id))
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  return pairPeopleToSeats([...grouped, ...ungrouped], input);
}

export function separate(input: PlacementInput): PlacementResult {
  // Round-robin between separation groups so they don't end up adjacent.
  const groups = (input.groups ?? []).map((g) => g.slice());
  const others = input.people.filter((p) => !groups.flat().includes(p.user_id));
  const ordered: SeatingPerson[] = [];
  let round = 0;
  while (groups.some((g) => g.length > 0)) {
    for (const g of groups) {
      const id = g.shift();
      if (!id) continue;
      const p = input.people.find((x) => x.user_id === id);
      if (p) ordered.push(p);
    }
    round += 1;
    if (round > 10000) break; // paranoid infinite-loop guard
  }
  // Interleave others so groups don't collide when re-densified
  const combined: SeatingPerson[] = [];
  const maxLen = Math.max(ordered.length, others.length);
  for (let i = 0; i < maxLen; i++) {
    if (ordered[i]) combined.push(ordered[i]);
    if (others[i]) combined.push(others[i]);
  }
  return pairPeopleToSeats(combined, input);
}

/**
 * Front-row priority: `priorityPersonIds` are placed first (they land in
 * the top-of-canvas seats first thanks to sortedSeats row-major order),
 * then everyone else alphabetical.
 */
export function frontRowPriority(
  input: PlacementInput & { priorityPersonIds?: Set<string> },
): PlacementResult {
  const priority = input.priorityPersonIds ?? new Set(input.groups?.flat() ?? []);
  const first = input.people.filter((p) => priority.has(p.user_id))
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  const rest = input.people.filter((p) => !priority.has(p.user_id))
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  return pairPeopleToSeats([...first, ...rest], input);
}

/**
 * Accessibility priority: prefer seats flagged with
 * `properties.accessibility_only === true` for the priority set. Falls back
 * to the normal front-of-house behaviour when no seats are flagged.
 */
export function accessibilityPriority(
  input: PlacementInput & { priorityPersonIds?: Set<string> },
): PlacementResult {
  const priority = input.priorityPersonIds ?? new Set(input.groups?.flat() ?? []);
  const locked = new Set([...(input.lockedPersonIds ?? [])]);
  const existingByObj = new Map(input.assignments.map((a) => [a.chart_object_id, a] as const));
  const lockedSeatIds = new Set<string>();
  input.assignments.forEach((a) => {
    if (a.profile_id && locked.has(a.profile_id)) lockedSeatIds.add(a.chart_object_id);
  });

  const openSeats = sortedSeats(seatObjects(input.objects)).filter((s) => !lockedSeatIds.has(s.id));
  const accessibleSeats = openSeats.filter((s) => (s.properties as any)?.accessibility_only === true);
  const otherSeats = openSeats.filter((s) => (s.properties as any)?.accessibility_only !== true);

  const priorityPeople = input.people
    .filter((p) => priority.has(p.user_id) && !locked.has(p.user_id))
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  const otherPeople = input.people
    .filter((p) => !priority.has(p.user_id) && !locked.has(p.user_id))
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));

  const seatOrder = [...accessibleSeats, ...otherSeats];
  const peopleOrder = [...priorityPeople, ...otherPeople];

  const nextAssignments: SeatingAssignment[] = [];
  const takenIds = new Set<string>();
  for (let i = 0; i < seatOrder.length && i < peopleOrder.length; i++) {
    nextAssignments.push(buildAssignment(seatOrder[i], peopleOrder[i], input, existingByObj.get(seatOrder[i].id)));
    takenIds.add(peopleOrder[i].user_id);
  }
  const unassigned = peopleOrder.filter((p) => !takenIds.has(p.user_id));
  const flaggedCount = accessibleSeats.length;
  const message = flaggedCount === 0
    ? `No accessibility-flagged seats. Placed ${nextAssignments.length} people, priority first.`
    : `Placed ${nextAssignments.length} people; priority set filled ${Math.min(priorityPeople.length, flaggedCount)} accessibility seat(s).`;
  return { assignments: nextAssignments, unassigned, message };
}

export function runRule(rule: PlacementRule, input: PlacementInput): PlacementResult {
  switch (rule) {
    case 'alphabetical':          return alphabetical(input);
    case 'random':                return random(input);
    case 'group_by_section':      return groupBySection(input);
    case 'keep_together':         return keepTogether(input);
    case 'separate':              return separate(input);
    case 'height_order':          return heightOrder(input);
    case 'front_row_priority':    return frontRowPriority(input);
    case 'accessibility_priority': return accessibilityPriority(input);
  }
}
