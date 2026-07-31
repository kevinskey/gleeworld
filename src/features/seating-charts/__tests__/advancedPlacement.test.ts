import { describe, it, expect } from 'vitest';
import { runRule, type PlacementInput } from '../placement/rules';
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';

function seat(id: string, x: number, y: number, accessibility = false): SeatingObject {
  return {
    id, tenant_id: 't', arrangement_id: 'a', object_type: 'chair', subtype: null,
    x, y, width: 40, height: 40, rotation: 0, z_index: 0,
    label: null, style: {},
    properties: accessibility ? { accessibility_only: true } : {},
    locked: false, group_id: null, created_at: '', updated_at: '',
  };
}

// Real users must have uuid ids — non-uuid ids are routed to external_person_id.
const UID: Record<string, string> = {
  p1: '00000000-0000-4000-8000-000000000001',
  p2: '00000000-0000-4000-8000-000000000002',
  p3: '00000000-0000-4000-8000-000000000003',
};

function person(id: string, name: string): SeatingPerson {
  return { user_id: UID[id] ?? id, full_name: name, voice_part: null, avatar_url: null };
}

function input(over: Partial<PlacementInput & { priorityPersonIds: Set<string> }> = {}): PlacementInput & { priorityPersonIds?: Set<string> } {
  return {
    objects: [seat('front', 0, 0), seat('middle', 0, 100), seat('back', 0, 200)],
    assignments: [],
    people: [person('p1', 'Ada'), person('p2', 'Ben'), person('p3', 'Cam')],
    arrangementId: 'a', tenantId: 't',
    ...over,
  };
}

describe('front_row_priority', () => {
  it('places priority people at the top of the canvas first', () => {
    const result = runRule('front_row_priority', input({
      priorityPersonIds: new Set([UID.p3]),
    }));
    expect(result.assignments[0].profile_id).toBe(UID.p3);
    // Remaining seats go alphabetically
    expect(result.assignments[1].profile_id).toBe(UID.p1);
    expect(result.assignments[2].profile_id).toBe(UID.p2);
  });

  it('falls back to alphabetical when no priority set is given', () => {
    const result = runRule('front_row_priority', input({ priorityPersonIds: new Set() }));
    expect(result.assignments.map((a) => a.profile_id)).toEqual([UID.p1, UID.p2, UID.p3]);
  });
});

describe('accessibility_priority', () => {
  it('places priority people in accessibility_only seats first', () => {
    const result = runRule('accessibility_priority', input({
      objects: [seat('a1', 300, 0, true), seat('n1', 0, 0), seat('n2', 200, 0)],
      priorityPersonIds: new Set([UID.p2]),
    }));
    const firstAsn = result.assignments.find((a) => a.chart_object_id === 'a1');
    expect(firstAsn?.profile_id).toBe(UID.p2);
  });

  it('leaves message noting when no accessibility seats exist', () => {
    const result = runRule('accessibility_priority', input({
      priorityPersonIds: new Set(['p1']),
    }));
    expect(result.message).toMatch(/No accessibility-flagged seats/);
  });
});
