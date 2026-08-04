import { describe, it, expect } from 'vitest';
import { runRule } from '../placement/rules';
import type { PlacementInput } from '../placement/rules';
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';

function seat(id: string, x: number, y: number, locked = false): SeatingObject {
  return {
    id, tenant_id: 't', arrangement_id: 'a',
    object_type: 'chair', subtype: null,
    x, y, width: 40, height: 40, rotation: 0, z_index: 0,
    label: null, style: {}, properties: {}, locked, group_id: null,
    created_at: '', updated_at: '',
  };
}

// Real users must have uuid ids — non-uuid ids are routed to external_person_id.
const UID: Record<string, string> = {
  p1: '00000000-0000-4000-8000-000000000001',
  p2: '00000000-0000-4000-8000-000000000002',
  p3: '00000000-0000-4000-8000-000000000003',
};

function person(id: string, name: string, voice_part: string | null = null): SeatingPerson {
  return { user_id: UID[id] ?? id, full_name: name, voice_part, avatar_url: null };
}

function baseInput(overrides: Partial<PlacementInput> = {}): PlacementInput {
  return {
    objects: [seat('s1', 0, 0), seat('s2', 0, 100), seat('s3', 0, 200)],
    assignments: [],
    people: [person('p1', 'Zoe'), person('p2', 'Anna'), person('p3', 'Mike')],
    arrangementId: 'a', tenantId: 't',
    ...overrides,
  };
}

describe('placement rules', () => {
  it('alphabetical fills seats by name ascending', () => {
    const result = runRule('alphabetical', baseInput());
    expect(result.assignments).toHaveLength(3);
    expect(result.assignments[0].display_name).toBe('Anna');
    expect(result.assignments[1].display_name).toBe('Mike');
    expect(result.assignments[2].display_name).toBe('Zoe');
  });

  it('random assigns exactly min(seats, people)', () => {
    const result = runRule('random', baseInput());
    expect(result.assignments).toHaveLength(3);
  });

  it('group_by_section keeps voice parts adjacent', () => {
    const input = baseInput({
      people: [
        person('p1', 'Ada', 'Alto'),
        person('p2', 'Sam', 'Soprano'),
        person('p3', 'Bob', 'Soprano'),
      ],
    });
    const result = runRule('group_by_section', input);
    const parts = result.assignments.map((a) => a.voice_part);
    // First two should share section (Alto or Soprano), sorted section keys.
    // Alphabetical section order: Alto, Soprano.
    expect(parts[0]).toBe('Alto');
    expect(parts[1]).toBe('Soprano');
    expect(parts[2]).toBe('Soprano');
  });

  it('preserves locked people and skips their seats', () => {
    const existing: SeatingAssignment = {
      id: 'a1', tenant_id: 't', arrangement_id: 'a', chart_object_id: 's1',
      profile_id: 'locked', external_person_id: null, display_name: 'Locked One',
      section: null, voice_part: null, instrument: null, chair_number: null,
      assignment_status: 'assigned', properties: {}, created_at: '', updated_at: '',
    };
    const input = baseInput({
      assignments: [existing],
      lockedPersonIds: new Set(['locked']),
    });
    const result = runRule('alphabetical', input);
    // s1 is locked → not touched. Only s2 + s3 get new assignments.
    const objectIds = result.assignments.map((a) => a.chart_object_id);
    expect(objectIds).not.toContain('s1');
    expect(result.assignments).toHaveLength(2);
  });

  it('unassigned overflow reports people that could not be seated', () => {
    const input = baseInput({
      objects: [seat('s1', 0, 0)],
      people: [person('p1', 'A'), person('p2', 'B')],
    });
    const result = runRule('alphabetical', input);
    expect(result.assignments).toHaveLength(1);
    expect(result.unassigned).toHaveLength(1);
    expect(result.unassigned[0].full_name).toBe('B');
  });

  it('height_order places tallest first (top of row-major order)', () => {
    const input = baseInput({
      personHeight: new Map([[UID.p1, 180], [UID.p2, 160], [UID.p3, 170]]),
    });
    const result = runRule('height_order', input);
    expect(result.assignments[0].profile_id).toBe(UID.p1); // 180cm
    expect(result.assignments[1].profile_id).toBe(UID.p3); // 170cm
    expect(result.assignments[2].profile_id).toBe(UID.p2); // 160cm
  });
});
