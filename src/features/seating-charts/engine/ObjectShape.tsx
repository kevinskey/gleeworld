// Pure-SVG renderer for one seating object. No React state — the parent
// (CanvasEngine) owns selection + drag.
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';
import { ATTENDANCE_COLORS, type AttendanceStatus } from '../attendance/attendanceStatus';

interface ObjectShapeProps {
  object: SeatingObject;
  assignment?: SeatingAssignment;
  selected: boolean;
  displayLabel?: string;
  attendanceStatus?: AttendanceStatus;
}

function assignedFill(base: string | undefined, hasPerson: boolean, isAbsent: boolean): string {
  if (!hasPerson) return base ?? '#f1f5f9';
  if (isAbsent) return '#fecaca';
  return base ?? '#c7d2fe';
}

export function ObjectShape({ object, assignment, selected, displayLabel, attendanceStatus }: ObjectShapeProps) {
  const x = Number(object.x);
  const y = Number(object.y);
  const w = Number(object.width);
  const h = Number(object.height);
  const style = object.style ?? {};
  const rotation = Number(object.rotation) || 0;
  const transform = rotation ? `rotate(${rotation} ${x + w / 2} ${y + h / 2})` : undefined;

  const hasPerson = !!assignment?.profile_id;
  const isAbsent = assignment?.assignment_status === 'absent';
  const fill = ['seat', 'chair', 'riser_slot', 'desk'].includes(object.object_type)
    ? assignedFill(style.fill, hasPerson, isAbsent)
    : style.fill ?? '#e2e8f0';
  const stroke = selected ? '#2563eb' : style.stroke ?? 'transparent';
  const strokeWidth = selected ? 3 : style.strokeWidth ?? 1;
  const label = displayLabel ?? assignment?.display_name ?? object.label ?? '';

  const bodyShape = (() => {
    switch (object.object_type) {
      case 'seat':
      case 'chair':
      case 'riser_slot':
      case 'microphone':
        return (
          <rect
            x={x} y={y} width={w} height={h}
            rx={style.radius ?? Math.min(w, h) / 2}
            ry={style.radius ?? Math.min(w, h) / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
        );
      case 'stage_boundary':
        return (
          <rect x={x} y={y} width={w} height={h}
            fill={fill} stroke={stroke === 'transparent' ? '#94a3b8' : stroke}
            strokeWidth={strokeWidth} strokeDasharray="6 6" />
        );
      default:
        return (
          <rect x={x} y={y} width={w} height={h}
            rx={style.radius ?? 4}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        );
    }
  })();

  return (
    <g transform={transform} data-object-id={object.id} data-object-type={object.object_type}>
      {bodyShape}
      {label && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          textAnchor="middle"
          fontSize={style.fontSize ?? Math.max(9, Math.min(12, w / 6))}
          fontWeight={style.fontWeight ?? 500}
          fill={style.color ?? '#0f172a'}
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {label.length > 18 ? `${label.slice(0, 16)}…` : label}
        </text>
      )}
      {object.locked && (
        <circle cx={x + w - 6} cy={y + 6} r={4} fill="#64748b" />
      )}
      {attendanceStatus && attendanceStatus !== 'unknown' && hasPerson && (
        <circle cx={x + 6} cy={y + 6} r={4} fill={ATTENDANCE_COLORS[attendanceStatus]} stroke="#fff" strokeWidth={1} />
      )}
    </g>
  );
}

export default ObjectShape;
