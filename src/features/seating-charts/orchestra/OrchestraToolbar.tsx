// Toolbar chip visible only for orchestra arrangements. Two actions:
// - Auto-number chairs (row-major per string section)
// - Rotate stands (swap 1↔2, 3↔4, … within each section)
import { useMemo } from 'react';
import { Music4, Hash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { autoNumberChairs, rotateStrings, isOrchestraArrangement } from './orchestraOps';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

interface OrchestraToolbarProps {
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  onApplyChairNumbers: (patches: Array<{ id: string; chair_number: number }>) => void;
  onRotateStands: (swaps: Array<{ aId: string; bId: string; aChartObjectId: string; bChartObjectId: string }>) => void;
}

export function OrchestraToolbar({
  objects, assignments, onApplyChairNumbers, onRotateStands,
}: OrchestraToolbarProps) {
  const active = useMemo(() => isOrchestraArrangement(objects), [objects]);
  if (!active) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Orchestra tools">
          <Music4 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 text-xs">
        <p className="font-semibold text-sm">Orchestra chair tools</p>
        <Button
          variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
          onClick={() => {
            const patches = autoNumberChairs(objects, assignments);
            if (patches.length === 0) { alert('All chairs already numbered.'); return; }
            onApplyChairNumbers(patches.map((p) => ({ id: p.assignmentId, chair_number: p.chair_number })));
          }}
        >
          <Hash className="w-4 h-4" /> Auto-number chairs
        </Button>
        <Button
          variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
          onClick={() => {
            const swaps = rotateStrings(objects, assignments);
            if (swaps.length === 0) { alert('No stands to rotate.'); return; }
            if (!confirm(`Swap ${swaps.length} stand pair(s) across all string sections?`)) return;
            onRotateStands(swaps);
          }}
        >
          <RefreshCw className="w-4 h-4" /> Rotate stands
        </Button>
        <p className="text-xs text-muted-foreground">
          Rotation keeps chair numbers put — the leader position stays chair 1; the person occupying it swaps with their stand partner.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export default OrchestraToolbar;
