import { describe, it, expect } from 'vitest';
import {
  isOrchestraArrangement, autoNumberChairs, rotateStrings,
} from '../orchestra/orchestraOps';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

function chair(id: string, subtype: string, x: number, y: number): SeatingObject {
  return {
    id, tenant_id: 't', arrangement_id: 'a', object_type: 'chair', subtype,
    x, y, width: 40, height: 40, rotation: 0, z_index: 0,
    label: null, style: {}, properties: {}, locked: false, group_id: null,
    created_at: '', updated_at: '',
  };
}

function assign(id: string, objId: string, uid: string | null, chair_number: number | null = null): SeatingAssignment {
  return {
    id, tenant_id: 't', arrangement_id: 'a', chart_object_id: objId,
    profile_id: uid, external_person_id: null, display_name: 'x',
    section: null, voice_part: null, instrument: null, chair_number,
    assignment_status: 'assigned', properties: {}, created_at: '', updated_at: '',
  };
}

describe('isOrchestraArrangement', () => {
  it('true when at least one string subtype seat exists', () => {
    expect(isOrchestraArrangement([chair('c1', 'violin1', 0, 0)])).toBe(true);
    expect(isOrchestraArrangement([chair('c1', 'cello', 0, 0)])).toBe(true);
  });
  it('false when there are only choir slots', () => {
    const s: SeatingObject = { ...chair('c1', 'choir', 0, 0), object_type: 'riser_slot' };
    expect(isOrchestraArrangement([s])).toBe(false);
  });
});

describe('autoNumberChairs', () => {
  it('numbers chairs 1..N in row-major order per section, skipping empty seats', () => {
    const objects = [
      chair('v1a', 'violin1', 0, 0),
      chair('v1b', 'violin1', 60, 0),
      chair('v1c', 'violin1', 0, 60),
      chair('cA', 'cello', 200, 0),
      chair('cB', 'cello', 260, 0),
    ];
    const assignments = [
      assign('a-v1a', 'v1a', 'u1'),
      assign('a-v1b', 'v1b', 'u2'),
      assign('a-v1c', 'v1c', null),       // empty seat — skip
      assign('a-cA',  'cA',  'u3'),
      assign('a-cB',  'cB',  'u4'),
    ];
    const patches = autoNumberChairs(objects, assignments);
    const map = Object.fromEntries(patches.map((p) => [p.assignmentId, p.chair_number]));
    expect(map['a-v1a']).toBe(1);
    expect(map['a-v1b']).toBe(2);
    expect(map['a-v1c']).toBeUndefined();
    expect(map['a-cA']).toBe(1);
    expect(map['a-cB']).toBe(2);
  });

  it('emits no patches when chairs are already numbered correctly', () => {
    const objects = [chair('v1a', 'violin1', 0, 0), chair('v1b', 'violin1', 60, 0)];
    const assignments = [assign('a-v1a', 'v1a', 'u1', 1), assign('a-v1b', 'v1b', 'u2', 2)];
    expect(autoNumberChairs(objects, assignments)).toEqual([]);
  });
});

describe('rotateStrings', () => {
  it('pairs 1↔2, 3↔4 within each section', () => {
    const objects = [
      chair('v1a', 'violin1', 0, 0),
      chair('v1b', 'violin1', 60, 0),
      chair('v1c', 'violin1', 120, 0),
      chair('v1d', 'violin1', 180, 0),
    ];
    const assignments = [
      assign('a1', 'v1a', 'u1'),
      assign('a2', 'v1b', 'u2'),
      assign('a3', 'v1c', 'u3'),
      assign('a4', 'v1d', 'u4'),
    ];
    const swaps = rotateStrings(objects, assignments);
    expect(swaps).toHaveLength(2);
    expect(swaps[0].aChartObjectId).toBe('v1a');
    expect(swaps[0].bChartObjectId).toBe('v1b');
    expect(swaps[1].aChartObjectId).toBe('v1c');
    expect(swaps[1].bChartObjectId).toBe('v1d');
  });

  it('does not include odd trailing chair (no partner)', () => {
    const objects = [chair('a', 'viola', 0, 0), chair('b', 'viola', 60, 0), chair('c', 'viola', 120, 0)];
    const assignments = [assign('x', 'a', 'u1'), assign('y', 'b', 'u2'), assign('z', 'c', 'u3')];
    const swaps = rotateStrings(objects, assignments);
    expect(swaps).toHaveLength(1);
  });

  it('ignores seats without an assignment', () => {
    const objects = [chair('a', 'viola', 0, 0), chair('b', 'viola', 60, 0)];
    // Only one assignment → cannot swap.
    const assignments = [assign('x', 'a', 'u1')];
    expect(rotateStrings(objects, assignments)).toEqual([]);
  });
});
