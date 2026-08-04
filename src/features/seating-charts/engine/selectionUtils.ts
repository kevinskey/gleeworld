// Helpers for snap-to-grid, alignment, and bounding boxes.
// Kept dependency-free so unit tests run without React.
import type { SeatingObject } from '@/types/seatingCharts';

export const GRID_SIZE = 8;

export function snap(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function objectBounds(objects: SeatingObject[]): Bounds {
  if (objects.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    minX = Math.min(minX, Number(o.x));
    minY = Math.min(minY, Number(o.y));
    maxX = Math.max(maxX, Number(o.x) + Number(o.width));
    maxY = Math.max(maxY, Number(o.y) + Number(o.height));
  }
  return { minX, minY, maxX, maxY };
}

export function isInsideBox(
  o: SeatingObject,
  box: { x: number; y: number; w: number; h: number },
): boolean {
  const cx = Number(o.x) + Number(o.width) / 2;
  const cy = Number(o.y) + Number(o.height) / 2;
  return cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + box.h;
}

export function fitScale(canvasW: number, canvasH: number, viewportW: number, viewportH: number, padding = 40): number {
  return Math.min(1, (viewportW - padding * 2) / canvasW, (viewportH - padding * 2) / canvasH);
}
