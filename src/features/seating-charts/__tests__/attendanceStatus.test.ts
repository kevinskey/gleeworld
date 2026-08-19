import { describe, it, expect } from 'vitest';
import { countAttendance, reflowAbsent, ATTENDANCE_COLORS } from '../attendance/attendanceStatus';
import type { AttendanceStatus } from '../attendance/attendanceStatus';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

function seat(id: string, x: number, y: number): SeatingObject {
  return {
    id, tenant_id: 't', arrangement_id: 'a', object_type: 'chair', subtype: null,
    x, y, width: 40, height: 40, rotation: 0, z_index: 0,
    label: null, style: {}, properties: {}, locked: false, group_id: null,
    created_at: '', updated_at: '',
  };
}

function assign(id: string, seatId: string, profileId: string | null): SeatingAssignment {
  return {
    id, tenant_id: 't', arrangement_id: 'a', chart_object_id: seatId,
    profile_id: profileId, external_person_id: null, display_name: 'Test',
    section: null, voice_part: null, instrument: null, chair_number: null,
    assignment_status: 'assigned', properties: {}, created_at: '', updated_at: '',
  };
}

describe('attendance colors', () => {
  it('assigns a distinct color to each real status', () => {
    const statuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
    const colors = statuses.map((s) => ATTENDANCE_COLORS[s]);
    expect(new Set(colors).size).toBe(statuses.length);
  });

  it('unknown status renders as transparent so no dot shows', () => {
    expect(ATTENDANCE_COLORS.unknown).toBe('transparent');
  });
});

describe('countAttendance', () => {
  it('tallies each status and counts unknown for missing records', () => {
    const assignments = [
      assign('a1', 's1', 'u1'),
      assign('a2', 's2', 'u2'),
      assign('a3', 's3', 'u3'),
      assign('a4', 's4', null), // guest without profile_id → unknown
    ];
    const byUserId = new Map<string, AttendanceStatus>([
      ['u1', 'present'],
      ['u2', 'absent'],
      // u3 has no record → unknown
    ]);
    const counts = countAttendance(assignments, byUserId);
    expect(counts.present).toBe(1);
    expect(counts.absent).toBe(1);
    expect(counts.unknown).toBe(2);
    expect(counts.total).toBe(4);
  });
});

describe('reflowAbsent', () => {
  it('returns hold-row positions for absent seats only', () => {
    const objects = [seat('s1', 100, 200), seat('s2', 200, 200), seat('s3', 300, 200)];
    const assignments = [assign('a1', 's1', 'u1'), assign('a2', 's2', 'u2'), assign('a3', 's3', 'u3')];
    const byUserId = new Map<string, AttendanceStatus>([
      ['u1', 'present'],
      ['u2', 'absent'],
      ['u3', 'absent'],
    ]);
    const moves = reflowAbsent(objects, assignments, byUserId, -80);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.y === -80)).toBe(true);
    expect(moves[0].x).toBeLessThan(moves[1].x);
    // s1 (present) must not be moved
    expect(moves.find((m) => m.id === 's1')).toBeUndefined();
  });

  it('returns empty list when nobody is absent', () => {
    const objects = [seat('s1', 100, 200)];
    const assignments = [assign('a1', 's1', 'u1')];
    const byUserId = new Map<string, AttendanceStatus>([['u1', 'present']]);
    expect(reflowAbsent(objects, assignments, byUserId)).toEqual([]);
  });

  it('ignores absent guests (no profile_id)', () => {
    const objects = [seat('s1', 100, 200)];
    const assignments = [assign('a1', 's1', null)];
    const byUserId = new Map<string, AttendanceStatus>();
    expect(reflowAbsent(objects, assignments, byUserId)).toEqual([]);
  });
});
