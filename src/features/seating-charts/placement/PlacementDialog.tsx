// Auto-placement dialog: pick a rule, preview, apply.
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { runRule, type PlacementInput, type PlacementResult, type PlacementRule } from './rules';
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';

interface PlacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  people: SeatingPerson[];
  arrangementId: string;
  tenantId: string;
  onApply: (assignments: SeatingAssignment[]) => void;
}

const RULES: Array<{ key: PlacementRule; label: string; help: string }> = [
  { key: 'alphabetical',     label: 'Alphabetical',       help: 'Fills seats top-left → bottom-right by name.' },
  { key: 'random',           label: 'Random',             help: 'Shuffle then fill.' },
  { key: 'group_by_section', label: 'Group by voice part / section', help: 'People with the same voice part sit together.' },
  { key: 'height_order',     label: 'Height order (tallest at back)', help: 'Requires height data on profiles; falls back to alphabetical when missing.' },
];

export function PlacementDialog({
  open, onOpenChange, objects, assignments, people, arrangementId, tenantId, onApply,
}: PlacementDialogProps) {
  const [rule, setRule] = useState<PlacementRule>('alphabetical');

  const input: PlacementInput = useMemo(() => ({
    objects, assignments, people, arrangementId, tenantId,
  }), [objects, assignments, people, arrangementId, tenantId]);

  const preview: PlacementResult | null = useMemo(
    () => (open ? runRule(rule, input) : null),
    [open, rule, input],
  );

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
            <p className="text-[11px] text-muted-foreground mt-1">
              {RULES.find((r) => r.key === rule)?.help}
            </p>
          </div>
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
