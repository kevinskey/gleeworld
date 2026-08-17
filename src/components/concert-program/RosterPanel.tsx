// Roster panel — the on-page roster block (BlockRenderers' 'roster-section'
// and empty-roster-placeholder cases) is click-to-open; this hosts the
// EXISTING RosterEditor (src/components/concertPlanner/RosterEditor.tsx) in
// a Dialog on every breakpoint (the roster editor is form-like, so a Dialog
// is simpler than popover anchoring and fine on desktop too).
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RosterEditor } from '@/components/concertPlanner/RosterEditor';
import type { useConcertProgram } from '@/hooks/useConcertPrograms';

export interface RosterPanelProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  concert: ReturnType<typeof useConcertProgram>;
}

export function RosterPanel({ open, onOpenChange, concert }: RosterPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Roster</DialogTitle>
        </DialogHeader>
        <RosterEditor concert={concert} />
      </DialogContent>
    </Dialog>
  );
}
