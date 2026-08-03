// Stage-furniture library for the editor rail flyout: click to add.
import type { SeatingObject } from '@/types/seatingCharts';

type ObjectPartial = Omit<SeatingObject, 'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'>;

interface ObjectsPanelProps {
  onAddObject: (partial: ObjectPartial) => void;
}

const OBJECT_LIBRARY: Array<{ label: string; partial: ObjectPartial }> = [
  { label: 'Chair', partial: { object_type: 'chair', subtype: 'generic', x: 200, y: 200, width: 44, height: 44, rotation: 0, z_index: 20, label: 'Chair', style: { fill: '#e2e8f0', radius: 22, stroke: '#0f172a', strokeWidth: 1 }, properties: {}, locked: false, group_id: null } },
  { label: 'Stool', partial: { object_type: 'chair', subtype: 'stool', x: 200, y: 200, width: 36, height: 36, rotation: 0, z_index: 20, label: 'Stool', style: { fill: '#fef3c7', radius: 18, stroke: '#92400e', strokeWidth: 1 }, properties: {}, locked: false, group_id: null } },
  { label: 'Desk', partial: { object_type: 'desk', subtype: 'student', x: 200, y: 200, width: 60, height: 44, rotation: 0, z_index: 20, label: 'Desk', style: { fill: '#e0e7ff', radius: 4, stroke: '#4338ca', strokeWidth: 1 }, properties: {}, locked: false, group_id: null } },
  { label: 'Table', partial: { object_type: 'table', subtype: 'round', x: 200, y: 200, width: 120, height: 120, rotation: 0, z_index: 15, label: 'Table', style: { fill: '#f1f5f9', radius: 60, stroke: '#475569', strokeWidth: 2 }, properties: {}, locked: false, group_id: null } },
  { label: 'Music Stand', partial: { object_type: 'music_stand', subtype: 'stand', x: 200, y: 200, width: 24, height: 24, rotation: 0, z_index: 30, label: '♪', style: { fill: '#64748b', color: '#fff' }, properties: {}, locked: false, group_id: null } },
  { label: 'Microphone', partial: { object_type: 'microphone', subtype: 'vocal', x: 200, y: 200, width: 28, height: 28, rotation: 0, z_index: 30, label: 'Mic', style: { fill: '#f97316' }, properties: {}, locked: false, group_id: null } },
  { label: 'Monitor', partial: { object_type: 'monitor', subtype: 'floor', x: 200, y: 200, width: 80, height: 40, rotation: 0, z_index: 20, label: 'Monitor', style: { fill: '#0f172a', color: '#fff', radius: 4 }, properties: {}, locked: false, group_id: null } },
  { label: 'Piano', partial: { object_type: 'instrument', subtype: 'piano', x: 200, y: 200, width: 160, height: 80, rotation: 0, z_index: 20, label: 'Piano', style: { fill: '#111827', color: '#fff', radius: 6 }, properties: {}, locked: false, group_id: null } },
  { label: 'Drums', partial: { object_type: 'instrument', subtype: 'drums', x: 200, y: 200, width: 120, height: 120, rotation: 0, z_index: 20, label: 'Drums', style: { fill: '#111827', color: '#fff', radius: 6 }, properties: {}, locked: false, group_id: null } },
  { label: 'Riser Slot', partial: { object_type: 'riser_slot', subtype: 'choir', x: 200, y: 200, width: 44, height: 44, rotation: 0, z_index: 20, label: '·', style: { fill: '#fde68a', radius: 8, stroke: '#0f172a', strokeWidth: 1 }, properties: {}, locked: false, group_id: null } },
  { label: 'Label', partial: { object_type: 'label', subtype: 'text', x: 200, y: 200, width: 120, height: 24, rotation: 0, z_index: 40, label: 'Label', style: { fill: 'transparent', color: '#0f172a', fontWeight: 600 }, properties: {}, locked: false, group_id: null } },
  { label: 'Stage Boundary', partial: { object_type: 'stage_boundary', subtype: null, x: 200, y: 200, width: 400, height: 260, rotation: 0, z_index: 0, label: null, style: { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 2 }, properties: {}, locked: false, group_id: null } },
];

export function ObjectsPanel({ onAddObject }: ObjectsPanelProps) {
  return (
    <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start h-full">
      {OBJECT_LIBRARY.map((entry) => (
        <button
          key={entry.label}
          type="button"
          onClick={() => onAddObject(entry.partial)}
          className="border p-2 min-h-11 text-xs bg-card hover:bg-accent text-left"
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}

export default ObjectsPanel;
