import { describe, it, expect } from 'vitest';
import { buildEquipmentList } from '../exports/pdfExport';
import type { SeatingObject } from '@/types/seatingCharts';

function o(type: SeatingObject['object_type'], label: string, subtype: string | null = null): SeatingObject {
  return {
    id: Math.random().toString(), tenant_id: 't', arrangement_id: 'a',
    object_type: type, subtype, x: 0, y: 0, width: 10, height: 10, rotation: 0, z_index: 0,
    label, style: {}, properties: {}, locked: false, group_id: null,
    created_at: '', updated_at: '',
  };
}

describe('buildEquipmentList', () => {
  it('groups by category and counts identical labels', () => {
    const rows = buildEquipmentList([
      o('microphone', 'Vocal Mic'),
      o('microphone', 'Vocal Mic'),
      o('microphone', 'Instrument Mic'),
      o('monitor', 'Floor Monitor'),
      o('instrument', 'Drums'),
      o('label', 'Ignore me'),
    ]);
    const asMap = Object.fromEntries(rows.map((r) => [`${r.category}:${r.label}`, r.count]));
    expect(asMap['Microphones:Vocal Mic']).toBe(2);
    expect(asMap['Microphones:Instrument Mic']).toBe(1);
    expect(asMap['Monitors:Floor Monitor']).toBe(1);
    expect(asMap['Instruments:Drums']).toBe(1);
    // labels are not equipment; must not appear
    expect(Object.keys(asMap).some((k) => k.includes('Ignore me'))).toBe(false);
  });

  it('sorts categories alphabetically', () => {
    const rows = buildEquipmentList([
      o('monitor', 'X'),
      o('microphone', 'Y'),
      o('instrument', 'Z'),
    ]);
    const cats = rows.map((r) => r.category);
    // Categories in order: Instruments, Microphones, Monitors
    expect(cats).toEqual(['Instruments', 'Microphones', 'Monitors']);
  });

  it('sorts labels within a category alphabetically', () => {
    const rows = buildEquipmentList([
      o('microphone', 'Zebra'),
      o('microphone', 'Alpha'),
      o('microphone', 'Mike'),
    ]);
    expect(rows.map((r) => r.label)).toEqual(['Alpha', 'Mike', 'Zebra']);
  });

  it('returns empty list for a chart with no equipment', () => {
    const rows = buildEquipmentList([o('label', 'Only text')]);
    expect(rows).toEqual([]);
  });
});
