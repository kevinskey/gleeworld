// Editor left panel: People (draggable to canvas), Objects (add stage
// furniture), Templates (regenerate layout).
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SeatingObject, SeatingPerson } from '@/types/seatingCharts';

interface PaletteProps {
  people: SeatingPerson[];
  assignedPersonIds: Set<string>;
  peopleSearch: string;
  onPeopleSearchChange: (v: string) => void;
  onAddObject: (partial: Omit<SeatingObject, 'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'>) => void;
  onRefreshPeople: () => void;
}

const OBJECT_LIBRARY: Array<{ label: string; partial: Omit<SeatingObject, 'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'> }> = [
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

export function Palette({
  people, assignedPersonIds, peopleSearch, onPeopleSearchChange, onAddObject, onRefreshPeople,
}: PaletteProps) {
  const filtered = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    return people
      .filter((p) => !q || (p.full_name ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  }, [people, peopleSearch]);

  return (
    <aside className="w-full md:w-64 border-r bg-white flex flex-col shrink-0 h-full">
      <Tabs defaultValue="people" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 m-2">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="objects">Objects</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="flex-1 flex flex-col p-2 pt-0 space-y-2 overflow-hidden">
          <div className="flex gap-2">
            <Input
              value={peopleSearch}
              onChange={(e) => onPeopleSearchChange(e.target.value)}
              placeholder="Search people"
              className="h-8 text-xs"
            />
            <Button size="sm" variant="outline" className="h-8" onClick={onRefreshPeople}>↻</Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No people to place. Add roster members or use the object palette.</p>
            )}
            {filtered.map((p) => {
              const assigned = assignedPersonIds.has(p.user_id);
              return (
                <div
                  key={p.user_id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-seating-person', JSON.stringify({
                      profileId: p.user_id,
                      displayName: p.full_name ?? 'Unnamed',
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-grab text-xs ${
                    assigned ? 'bg-muted/40 text-muted-foreground' : 'bg-white hover:bg-accent'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold">
                    {(p.full_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{p.full_name ?? 'Unnamed'}</p>
                    {p.voice_part && <p className="text-[10px] text-muted-foreground truncate">{p.voice_part}</p>}
                  </div>
                  {assigned && <span className="text-[10px] text-muted-foreground">seated</span>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="objects" className="flex-1 overflow-y-auto p-2 pt-0 grid grid-cols-2 gap-2">
          {OBJECT_LIBRARY.map((entry) => (
            <button
              key={entry.label}
              type="button"
              onClick={() => onAddObject(entry.partial)}
              className="border rounded p-2 text-xs bg-white hover:bg-accent text-left"
            >
              {entry.label}
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

export default Palette;
