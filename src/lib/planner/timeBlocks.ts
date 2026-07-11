// Timeline geometry for the Day tab. Pure functions: given blocks
// (start + minutes) produce pixel positions, overlap columns, and
// conflict flags. The component stays dumb; this stays testable.
import { differenceInMinutes, parseISO, startOfDay } from 'date-fns';

export interface TimelineItem {
  id: string;
  kind: 'event' | 'task';
  label: string;
  startIso: string;
  minutes: number;
}

export interface LaidOutItem extends TimelineItem {
  /** minutes from the timeline's first hour */
  offsetMin: number;
  /** 0-based column among overlapping neighbors */
  column: number;
  /** total columns in this item's overlap cluster */
  columns: number;
  /** true when this item overlaps at least one other */
  conflicted: boolean;
}

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const SNAP_MINUTES = 30;

/** Minutes from DAY_START for a timestamp (clamped into the visible day). */
export function minutesIntoDay(iso: string, dayStartHour = DAY_START_HOUR): number {
  const d = parseISO(iso);
  const mins = differenceInMinutes(d, startOfDay(d)) - dayStartHour * 60;
  return Math.max(0, mins);
}

/** Snap raw minutes-from-day-start to the grid. */
export function snapMinutes(rawMin: number, snap = SNAP_MINUTES): number {
  return Math.round(rawMin / snap) * snap;
}

/**
 * Assign overlap columns (interval-graph coloring, greedy by start).
 * Items in the same overlap cluster share `columns` so widths line up.
 */
export function layoutTimeline(items: TimelineItem[], dayStartHour = DAY_START_HOUR): LaidOutItem[] {
  const sorted = [...items].sort(
    (a, b) => minutesIntoDay(a.startIso, dayStartHour) - minutesIntoDay(b.startIso, dayStartHour),
  );
  const placed: LaidOutItem[] = [];
  // cluster tracking: a cluster ends when nothing open overlaps the next item
  let cluster: LaidOutItem[] = [];
  let clusterEnd = -1;

  const finishCluster = () => {
    const width = Math.max(1, ...cluster.map((i) => i.column + 1));
    for (const item of cluster) {
      item.columns = width;
      item.conflicted = cluster.length > 1 && cluster.some(
        (o) => o !== item
          && item.offsetMin < o.offsetMin + o.minutes
          && o.offsetMin < item.offsetMin + item.minutes,
      );
    }
    cluster = [];
  };

  for (const raw of sorted) {
    const offsetMin = minutesIntoDay(raw.startIso, dayStartHour);
    if (cluster.length && offsetMin >= clusterEnd) finishCluster();
    // first column whose latest occupant has ended
    const colEnds: number[] = [];
    for (const member of cluster) {
      colEnds[member.column] = Math.max(colEnds[member.column] ?? 0, member.offsetMin + member.minutes);
    }
    let column = 0;
    while ((colEnds[column] ?? 0) > offsetMin) column++;
    const item: LaidOutItem = { ...raw, offsetMin, column, columns: 1, conflicted: false };
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, offsetMin + raw.minutes);
  }
  finishCluster();
  return placed;
}

/** True when a proposed block overlaps any existing item. */
export function wouldConflict(
  items: TimelineItem[],
  startIso: string,
  minutes: number,
  ignoreId?: string,
): boolean {
  const start = minutesIntoDay(startIso);
  const end = start + minutes;
  return items.some((i) => {
    if (i.id === ignoreId) return false;
    const iStart = minutesIntoDay(i.startIso);
    return start < iStart + i.minutes && iStart < end;
  });
}
