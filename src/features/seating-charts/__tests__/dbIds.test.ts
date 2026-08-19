// Regression tests for the uuid-id bug: every client-generated id that is
// persisted to a uuid column must be a real UUID, or Postgres rejects the
// whole insert (22P02) and charts silently come up empty.
import { describe, it, expect } from 'vitest';
import { ALL_TEMPLATES } from '../templates';
import { runRule } from '../placement/rules';
import type { PlacementInput } from '../placement/rules';
import type { SeatingObject, SeatingPerson } from '@/types/seatingCharts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function seat(id: string, x: number, y: number): SeatingObject {
  return {
    id, tenant_id: 't', arrangement_id: 'a',
    object_type: 'chair', subtype: null,
    x, y, width: 40, height: 40, rotation: 0, z_index: 0,
    label: null, style: {}, properties: {}, locked: false, group_id: null,
    created_at: '', updated_at: '',
  };
}

function person(id: string, name: string): SeatingPerson {
  return { user_id: id, full_name: name, voice_part: null, avatar_url: null };
}

function baseInput(overrides: Partial<PlacementInput> = {}): PlacementInput {
  return {
    objects: [seat('s1', 0, 0), seat('s2', 0, 100)],
    assignments: [],
    people: [person('11111111-1111-4111-8111-111111111111', 'Anna')],
    arrangementId: 'a', tenantId: 't',
    ...overrides,
  };
}

describe('database-ready ids', () => {
  it('every template object id is a valid uuid', () => {
    for (const t of ALL_TEMPLATES) {
      const spec = t.generate();
      for (const o of spec.objects) {
        expect(o.id, `template ${t.key} object id "${o.id}"`).toMatch(UUID_RE);
      }
    }
  });

  it('placement assignments get valid uuid ids', () => {
    const result = runRule('alphabetical', baseInput());
    expect(result.assignments.length).toBeGreaterThan(0);
    for (const a of result.assignments) {
      expect(a.id, `assignment id "${a.id}"`).toMatch(UUID_RE);
    }
  });

  it('placement routes imported guests to external_person_id, not profile_id', () => {
    const guest = person('guest_1769800000000_0', 'Guest Singer');
    const result = runRule('alphabetical', baseInput({ people: [guest] }));
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].profile_id).toBeNull();
    expect(result.assignments[0].external_person_id).toBe('guest_1769800000000_0');
    expect(result.assignments[0].display_name).toBe('Guest Singer');
  });

  it('placement keeps real user ids on profile_id', () => {
    const result = runRule('alphabetical', baseInput());
    expect(result.assignments[0].profile_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.assignments[0].external_person_id).toBeNull();
  });
});
