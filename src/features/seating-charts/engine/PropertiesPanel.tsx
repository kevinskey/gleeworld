// Right-hand panel: shows properties for the current selection.
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

interface PropertiesPanelProps {
  selection: SeatingObject[];
  assignmentByObjectId: Map<string, SeatingAssignment>;
  onUpdate: (id: string, patch: Partial<SeatingObject>) => void;
  onClearAssignment: (objectId: string) => void;
  onDelete: (ids: string[]) => void;
}

export function PropertiesPanel({
  selection, assignmentByObjectId, onUpdate, onClearAssignment, onDelete,
}: PropertiesPanelProps) {
  if (selection.length === 0) {
    return (
      <aside className="w-64 border-l bg-white p-3 shrink-0">
        <p className="text-xs text-muted-foreground">Select an object to edit its properties. Shift-click to select multiple.</p>
      </aside>
    );
  }

  if (selection.length > 1) {
    return (
      <aside className="w-64 border-l bg-white p-3 shrink-0 space-y-3">
        <div className="text-sm font-semibold">{selection.length} objects selected</div>
        <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(selection.map((s) => s.id))}>
          Delete selection
        </Button>
      </aside>
    );
  }

  const obj = selection[0];
  const assignment = assignmentByObjectId.get(obj.id);
  const patch = (p: Partial<SeatingObject>) => onUpdate(obj.id, p);

  return (
    <aside className="w-64 border-l bg-white p-3 shrink-0 overflow-y-auto space-y-3">
      <div>
        <p className="text-[10px] uppercase text-muted-foreground">{obj.object_type}{obj.subtype ? ` · ${obj.subtype}` : ''}</p>
        <Input
          value={obj.label ?? ''}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="Label"
          className="h-8 text-xs mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">X</Label>
          <Input
            type="number" value={Number(obj.x)}
            onChange={(e) => patch({ x: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Y</Label>
          <Input
            type="number" value={Number(obj.y)}
            onChange={(e) => patch({ y: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">W</Label>
          <Input
            type="number" value={Number(obj.width)}
            onChange={(e) => patch({ width: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">H</Label>
          <Input
            type="number" value={Number(obj.height)}
            onChange={(e) => patch({ height: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Rotation</Label>
          <Input
            type="number" value={Number(obj.rotation)}
            onChange={(e) => patch({ rotation: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Z</Label>
          <Input
            type="number" value={Number(obj.z_index)}
            onChange={(e) => patch({ z_index: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Locked</Label>
        <Switch checked={!!obj.locked} onCheckedChange={(v) => patch({ locked: v })} />
      </div>

      {assignment && (
        <div className="border rounded p-2 space-y-2 bg-muted/30">
          <p className="text-xs font-semibold">{assignment.display_name ?? 'Assigned'}</p>
          {assignment.voice_part && <p className="text-[10px] text-muted-foreground">{assignment.voice_part}</p>}
          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => onClearAssignment(obj.id)}>
            Clear seat
          </Button>
        </div>
      )}

      <Button variant="destructive" size="sm" className="w-full h-8" onClick={() => onDelete([obj.id])}>
        Delete
      </Button>
    </aside>
  );
}

export default PropertiesPanel;
