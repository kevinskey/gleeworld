// Pure helpers for attendance status: colors + reflow-selection algorithm.
// Kept dependency-free so unit tests run without React.
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'unknown';

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: '#22c55e', // green-500
  late:    '#f59e0b', // amber-500
  absent:  '#ef4444', // red-500
  excused: '#94a3b8', // slate-400
  unknown: 'transparent',
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late:    'Late',
  absent:  'Absent',
  excused: 'Excused',
  unknown: 'No record',
};

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  unknown: number;
  total: number;
}

export function countAttendance(
  assignments: SeatingAssignment[],
  byUserId: Map<string, AttendanceStatus>,
): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, late: 0, absent: 0, excused: 0, unknown: 0, total: 0 };
  for (const a of assignments) {
    counts.total += 1;
    const status = (a.profile_id && byUserId.get(a.profile_id)) || 'unknown';
    counts[status] += 1;
  }
  return counts;
}

/**
 * Reflow: return updated positions for absent-person seats, placing them
 * in a hold row above the canvas (y = -80, spread horizontally).
 * Non-absent seats keep their original position.
 */
export function reflowAbsent(
  objects: SeatingObject[],
  assignments: SeatingAssignment[],
  byUserId: Map<string, AttendanceStatus>,
  holdY = -80,
): Array<{ id: string; x: number; y: number }> {
  const assignedObj = new Map<string, SeatingAssignment>();
  assignments.forEach((a) => assignedObj.set(a.chart_object_id, a));

  const absentSeats = objects.filter((o) => {
    const a = assignedObj.get(o.id);
    if (!a || !a.profile_id) return false;
    return byUserId.get(a.profile_id) === 'absent';
  });

  return absentSeats.map((seat, i) => ({
    id: seat.id,
    x: 40 + i * (Number(seat.width) + 12),
    y: holdY,
  }));
}
