// Overlays for tap-to-jump circles on top of the rendered score.
//
// View mode: each visible jump becomes a clickable circle. Tap fires a
// flash + onJump(targetPage). Placement mode: tapping anywhere on the
// surface drops a new jump at that location and opens the target picker.

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { useSheetMusicJumps } from '@/hooks/useSheetMusicJumps';
import type { SheetMusicJump } from '@/lib/jumps';

interface JumpsOverlayProps {
  sheetMusicId: string;
  currentPage: number;
  totalPages: number;
  // Element to overlay over. We use it for click coordinates + size.
  surfaceRef: React.RefObject<HTMLDivElement>;
  placementMode: boolean;
  onPlacementEnd: () => void;
  onJump: (page: number) => void;
}

export function JumpsOverlay({
  sheetMusicId, currentPage, totalPages, surfaceRef, placementMode, onPlacementEnd, onJump,
}: JumpsOverlayProps) {
  const { jumps, addJump, deleteJump } = useSheetMusicJumps(sheetMusicId);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);

  const visible = jumps.filter((j) => j.source_page === currentPage);

  // Convert a click to a percentage based on the surface element's box.
  const handlePlace = (e: React.MouseEvent) => {
    if (!placementMode || !surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setPending({ x, y });
    setTargetInput(String(Math.min(totalPages, currentPage + 1)));
    setLabelInput('');
  };

  const confirm = async () => {
    if (!pending) return;
    const target = parseInt(targetInput, 10);
    if (!target || target < 1 || target > totalPages) return;
    await addJump.mutateAsync({
      tenant_id: '' as any, // trigger fills this
      source_page: currentPage,
      source_x_pct: pending.x,
      source_y_pct: pending.y,
      source_radius_pct: 0.05,
      target_page: target,
      label: labelInput.trim() || null,
      updated_at: new Date().toISOString(),
    } as any);
    setPending(null);
    onPlacementEnd();
  };

  const cancel = () => { setPending(null); onPlacementEnd(); };

  const handleTapCircle = (j: SheetMusicJump) => {
    setFlashId(j.id);
    window.setTimeout(() => { setFlashId(null); onJump(j.target_page); }, 220);
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-30 ${placementMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
        onClick={handlePlace}
      >
        {visible.map((j) => {
          const rect = surfaceRef.current?.getBoundingClientRect();
          if (!rect) return null;
          const sizePx = Math.max(28, j.source_radius_pct * 2 * rect.width);
          return (
            <button
              key={j.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleTapCircle(j); }}
              className={`absolute rounded-full border-2 border-primary bg-primary/15 hover:bg-primary/30 transition-colors pointer-events-auto ${
                flashId === j.id ? 'ring-4 ring-primary animate-pulse' : ''
              }`}
              style={{
                left: `${j.source_x_pct * 100}%`,
                top: `${j.source_y_pct * 100}%`,
                width: sizePx,
                height: sizePx,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={j.label ? `Jump: ${j.label}` : `Jump to page ${j.target_page}`}
              title={j.label ? `${j.label} → p.${j.target_page}` : `→ p.${j.target_page}`}
            />
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(v) => { if (!v) cancel(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New jump</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">Target page</Label>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="D.S. al Coda" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={confirm} disabled={addJump.isPending}>
              {addJump.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface JumpsListProps {
  sheetMusicId: string;
}

// List view of all jumps for the score — used in the Viewer's Tools sheet
// so the user can review and delete without re-entering placement mode.
export function JumpsList({ sheetMusicId }: JumpsListProps) {
  const { jumps, deleteJump } = useSheetMusicJumps(sheetMusicId);
  if (jumps.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No jumps yet.</p>;
  }
  return (
    <ul className="space-y-1 max-h-60 overflow-y-auto">
      {jumps.map((j) => (
        <li key={j.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-accent/40">
          <span className="text-xs tabular-nums text-muted-foreground w-12">p.{j.source_page}</span>
          <span className="text-xs">→</span>
          <span className="text-xs tabular-nums text-muted-foreground w-12">p.{j.target_page}</span>
          <span className="flex-1 truncate">{j.label ?? '—'}</span>
          <button
            type="button"
            onClick={() => deleteJump.mutate(j.id)}
            className="text-muted-foreground hover:text-destructive p-0.5"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
