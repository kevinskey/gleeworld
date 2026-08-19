// Small helpers for template generators. Templates return objects sans
// tenant/arrangement/timestamp fields; the hook fills those in on insert.
import type { SeatingObject, SeatingObjectStyle, SeatingObjectType } from '@/types/seatingCharts';
import { newDbId } from '../ids';

export type SeedObject = Omit<
  SeatingObject,
  'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'
> & { id?: string };

export interface MakeObjectArgs {
  object_type: SeatingObjectType;
  subtype?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  label?: string;
  style?: SeatingObjectStyle;
  properties?: Record<string, unknown>;
  locked?: boolean;
}

export function obj(a: MakeObjectArgs): SeedObject {
  return {
    id: newDbId(),
    object_type: a.object_type,
    subtype: a.subtype ?? null,
    x: a.x,
    y: a.y,
    width: a.width ?? 44,
    height: a.height ?? 44,
    rotation: a.rotation ?? 0,
    z_index: a.z_index ?? 10,
    label: a.label ?? null,
    style: a.style ?? {},
    properties: a.properties ?? {},
    locked: a.locked ?? false,
    group_id: null,
  };
}

// Section palette used across choir/band/orchestra templates.
export const SECTION_COLORS = {
  soprano:   '#fca5a5', // red-300
  alto:      '#fdba74', // orange-300
  tenor:     '#86efac', // green-300
  bass:      '#93c5fd', // blue-300
  s1:        '#fecaca',
  s2:        '#fca5a5',
  a1:        '#fed7aa',
  a2:        '#fdba74',
  t1:        '#bbf7d0',
  t2:        '#86efac',
  b1:        '#bfdbfe',
  b2:        '#93c5fd',
  flute:     '#93c5fd',
  clarinet:  '#c4b5fd',
  oboe:      '#a7f3d0',
  bassoon:   '#fcd34d',
  saxophone: '#fdba74',
  trumpet:   '#fca5a5',
  horn:      '#fcd34d',
  trombone:  '#fdba74',
  tuba:      '#a7f3d0',
  violin1:   '#fca5a5',
  violin2:   '#fdba74',
  viola:     '#a7f3d0',
  cello:     '#93c5fd',
  bass_v:    '#c4b5fd',
  perc:      '#e5e7eb',
  piano:     '#a5b4fc',
  guitar:    '#f9a8d4',
  harp:      '#fbcfe8',
  student:   '#e0e7ff',
  desk:      '#e5e7eb',
  neutral:   '#f1f5f9',
} as const;

// Curved arc of `count` points centred on (cx, cy) with `radius`, spanning
// `sweepDegrees`. Points bow UPWARD from the horizontal through (cx, cy) —
// i.e., y stays ≤ cy for the whole arc. Used for choir risers + concert-band
// front arcs where the conductor stands "downstage" from the singers.
export function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  sweepDegrees = 140,
): Array<{ x: number; y: number }> {
  const sweepRad = (Math.min(sweepDegrees, 180) * Math.PI) / 180;
  const stepRad = count === 1 ? 0 : sweepRad / (count - 1);
  const leftmost = Math.PI / 2 + sweepRad / 2; // near π (bow apex on left)
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const theta = leftmost - i * stepRad;
    out.push({ x: cx + radius * Math.cos(theta), y: cy - radius * Math.sin(theta) });
  }
  return out;
}
