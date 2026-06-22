// Drag-to-reorder + duplicate + delete grid of pages. Edits the per-score
// `page_order` array — the underlying PDF is never modified. Bookmarks /
// jumps / annotations stay tied to physical pages, so a rearrangement
// only affects how the reader walks the document.

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, RotateCcw, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSheetMusicPageOrder } from '@/hooks/useSheetMusicPageOrder';
import type { PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';

interface RearrangePagesDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sheetMusicId: string;
  totalPhysical: number;
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
}

export function RearrangePagesDialog({
  open, onOpenChange, sheetMusicId, totalPhysical, pdfRef,
}: RearrangePagesDialogProps) {
  const { effectiveOrder, savePageOrder } = useSheetMusicPageOrder(sheetMusicId, totalPhysical);
  const [order, setOrder] = useState<number[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Reset working order whenever we open with fresh data.
  useEffect(() => {
    if (!open) return;
    setOrder([...effectiveOrder]);
  }, [open, effectiveOrder]);

  // Render thumbnails of every UNIQUE physical page in the order.
  useEffect(() => {
    if (!open) return;
    const wanted = Array.from(new Set(order));
    let cancelled = false;
    (async () => {
      for (const p of wanted) {
        if (thumbs[p]) continue;
        const url = await pdfRef.current?.renderThumbnail(p, 0.22);
        if (cancelled) return;
        if (url) setThumbs((prev) => ({ ...prev, [p]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [open, order, pdfRef, thumbs]);

  const move = (from: number, to: number) => {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const duplicate = (idx: number) => {
    setOrder((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, prev[idx]);
      return next;
    });
  };

  const remove = (idx: number) => {
    setOrder((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setOrder(Array.from({ length: totalPhysical }, (_, i) => i + 1));
  };

  const handleSave = async () => {
    const isIdentity = order.length === totalPhysical && order.every((p, i) => p === i + 1);
    await savePageOrder.mutateAsync(isIdentity ? null : order);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Rearrange pages</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground mb-3">
            Drag a page to reorder. Use <Copy className="inline w-3 h-3" /> to duplicate (for repeats) or
            <Trash2 className="inline w-3 h-3 ml-1" /> to skip a page in this arrangement. The underlying PDF
            isn't modified; your bookmarks and annotations stay where they are.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {order.map((physical, idx) => (
              <PageThumb
                key={`${physical}-${idx}`}
                logicalIdx={idx}
                physical={physical}
                src={thumbs[physical]}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => { if (dragIdx !== null) move(dragIdx, idx); setDragIdx(null); }}
                onDuplicate={() => duplicate(idx)}
                onRemove={() => remove(idx)}
                isDragging={dragIdx === idx}
              />
            ))}
          </div>
        </div>
        <DialogFooter className="px-4 py-3 border-t flex-row items-center justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to original
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={savePageOrder.isPending}>
              {savePageOrder.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save arrangement
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageThumb({
  logicalIdx, physical, src, onDragStart, onDragOver, onDrop, onDuplicate, onRemove, isDragging,
}: {
  logicalIdx: number;
  physical: number;
  src?: string;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group relative aspect-[3/4] rounded border bg-card overflow-hidden flex items-center justify-center select-none',
        'transition-transform',
        isDragging ? 'opacity-50' : 'hover:border-primary',
      )}
    >
      {src ? <img src={src} alt={`p.${physical}`} className="w-full h-full object-contain" /> : null}
      <div className="absolute top-1 left-1 text-[10px] tabular-nums bg-background/90 px-1 rounded font-semibold">
        {logicalIdx + 1}
      </div>
      <div className="absolute top-1 right-1 text-[10px] tabular-nums bg-background/90 px-1 rounded text-muted-foreground">
        src&nbsp;p.{physical}
      </div>
      <div className="absolute bottom-1 inset-x-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onDuplicate}
          className="bg-background/90 hover:bg-accent rounded p-1"
          title="Duplicate (for repeats)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground rounded p-1"
          title="Skip in arrangement"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
