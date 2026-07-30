import { describe, it, expect } from 'vitest';
import { snap, objectBounds, isInsideBox, fitScale } from '../engine/selectionUtils';
import type { SeatingObject } from '@/types/seatingCharts';

function obj(x: number, y: number, w = 40, h = 40): SeatingObject {
  return {
    id: 'x', tenant_id: 't', arrangement_id: 'a',
    object_type: 'seat', subtype: null,
    x, y, width: w, height: h, rotation: 0, z_index: 0,
    label: null, style: {}, properties: {}, locked: false, group_id: null,
    created_at: '', updated_at: '',
  };
}

describe('snap', () => {
  it('rounds to nearest 8', () => {
    expect(snap(0)).toBe(0);
    expect(snap(3)).toBe(0);
    expect(snap(5)).toBe(8);
    expect(snap(11)).toBe(8);
    expect(snap(12)).toBe(16);
  });
  it('accepts custom grids', () => {
    expect(snap(23, 10)).toBe(20);
  });
});

describe('objectBounds', () => {
  it('returns zero bounds for empty list', () => {
    expect(objectBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
  it('spans multiple objects', () => {
    const b = objectBounds([obj(10, 10), obj(100, 200, 50, 20)]);
    expect(b).toEqual({ minX: 10, minY: 10, maxX: 150, maxY: 220 });
  });
});

describe('isInsideBox', () => {
  it('includes objects whose center is inside the box', () => {
    expect(isInsideBox(obj(20, 20), { x: 0, y: 0, w: 100, h: 100 })).toBe(true);
  });
  it('excludes objects whose center is outside the box', () => {
    expect(isInsideBox(obj(200, 200), { x: 0, y: 0, w: 100, h: 100 })).toBe(false);
  });
});

describe('fitScale', () => {
  it('never scales above 1', () => {
    expect(fitScale(400, 300, 800, 600)).toBe(1);
  });
  it('shrinks large canvases to fit', () => {
    const s = fitScale(2000, 1000, 800, 600);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});
