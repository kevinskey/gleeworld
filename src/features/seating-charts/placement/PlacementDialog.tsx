// Auto-placement dialog: pick a rule, preview, apply.
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { runRule, type PlacementInput, type PlacementResult, type PlacementRule } from './rules';
import { groupsOfKind, GROUP_KIND_LABEL, type GroupKind } from './groupState';
import type { SeatingAssignment, SeatingChart, SeatingObject, SeatingPerson } from '@/types/seatingCharts';

interface PlacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chart: SeatingChart;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  people: SeatingPerson[];
  arrangementId: string;
  tenantId: string;
  onApply: (assignments: SeatingAssignment[]) => void;
  onOpenGroupManager: () => void;
}

const RULES: Array<{ key: PlacementRule; label: string; help: string; groupKind?: GroupKind }> = [
  { key: 'alphabetical',          label: 'Alphabetical', help: 'Fills seats top-left → bottom-right by name.' },
  { key: 'random',                label: 'Random', help: 'Shuffle then fill.' },
  { key: 'group_by_section',      label: 'Group by voice part / section', help: 'People with the same voice part sit together.' },
  { key: 'height_order',          label: 'Height order (tallest at back)', help: 'Requires height data on profiles; falls back to alphabetical when missing.' },
  { key: 'keep_together',         label: 'Keep together (from groups)', help: 'Uses "Keep together" groups you defined.', groupKind: 'keep_together' },
  { key: 'separate',              label: 'Separate (from groups)', help: 'Uses "Separate" groups so members don\'t end up adjacent.', groupKind: 'separate' },
  { key: 'front_row_priority',    label: 'Front-row priority', help: 'People in a "Front row" group land at the top of the chart first.', groupKind: 'front_row' },
  { key: 'accessibility_priority', label: 'Accessibility priority', help: 'People in an "Accessibility" group prefer seats marked accessibility_only.', groupKind: 'accessibility' },
];

export function PlacementDialog({
  open, onOpenChange, chart, objects, assignments, people,
  arrangementId, tenantId, onApply, onOpenGroupManager,
}: PlacementDialogProps) {
  const [rule, setRule] = useState<PlacementRule>('alphabetical');

  const meta = RULES.find((r) => r.key === rule)!;
  const relevantGroups = useMemo(
    () => (meta.groupKind ? groupsOfKind(chart, meta.groupKind) : []),
    [chart, meta.groupKind],
  );

  const input: PlacementInput & { priorityPersonIds?: Set<string> } = useMemo(() => {
    const base: PlacementInput = { objects, assignments, people, arrangementId, tenantId };
    if (meta.groupKind === 'keep_together' || meta.groupKind === 'separate') {
      return { ...base, groups: relevantGroups.map((g) => g.member_user_ids.slice()) };
    }
    if (meta.groupKind === 'front_row' || meta.groupKind === 'accessibility') {
      const ids = new Set(relevantGroups.flatMap((g) => g.member_user_ids));
      return { ...base, priorityPersonIds: ids, groups: relevantGroups.map((g) => g.member_user_ids.slice()) };
    }
    return base;
  }, [objects, assignments, people, arrangementId, tenantId, relevantGroups, meta.groupKind]);

  const preview: PlacementResult | null = useMemo(
    () => (open ? runRule(rule, input) : null),
    [open, rule, input],
  );

  const groupsMissing = meta.groupKind && relevantGroups.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Auto-place people</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Rule</label>
            <Select value={rule} onValueChange={(v) => setRule(v as PlacementRule)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">{meta.help}</p>
          </div>

          {meta.groupKind && (
            <div className="border rounded p-2 text-xs bg-muted/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{GROUP_KIND_LABEL[meta.groupKind]} groups</p>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={onOpenGroupManager}>Manage</Button>
              </div>
              {groupsMissing ? (
                <p className="text-amber-700">No groups defined yet. Open "Manage" to create one.</p>
              ) : (
                <ul className="space-y-0.5">
                  {relevantGroups.map((g) => (
                    <li key={g.id}>· {g.name} ({g.member_user_ids.length} people)</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {preview && (
            <div className="border rounded p-3 text-xs space-y-1 bg-muted/30">
              <p><strong>Preview:</strong> {preview.message}</p>
              <p>Seats available: {input.objects.filter((o) => ['seat','chair','riser_slot','desk'].includes(o.object_type) && !o.locked).length}</p>
              <p>People in pool: {people.length}</p>
              {preview.unassigned.length > 0 && (
                <p className="text-amber-700">
                  Unassigned: {preview.unassigned.slice(0, 5).map((p) => p.full_name).join(', ')}
                  {preview.unassigned.length > 5 && ` +${preview.unassigned.length - 5} more`}
                </p>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Applying replaces current assignments on unlocked seats. Locked people stay put.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!preview || preview.assignments.length === 0}
            onClick={() => {
              if (preview) onApply(preview.assignments);
              onOpenChange(false);
            }}
          >
            Apply placement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PlacementDialog;
