// Cursor-anchored confirm pill — a lightweight replacement for native
// confirm() on destructive row actions. Renders a rounded-full popover
// near the click point instead of a browser-modal dialog.
//
// Usage:
//   const [confirm, setConfirm] = useState<ConfirmPillRequest | null>(null);
//   <Button onClick={(e) => setConfirm({ x: e.clientX, y: e.clientY, message: 'Delete "Take 1"?' })} />
//   <ConfirmPill request={confirm} busy={mut.isPending}
//     onConfirm={...} onCancel={() => setConfirm(null)} />

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConfirmPillRequest {
  /** Viewport coordinates of the triggering click (e.clientX / e.clientY). */
  x: number;
  y: number;
  message: string;
  confirmLabel?: string;
}

const EDGE = 8; // min gap from viewport edges
const OFFSET = 10; // gap between cursor and pill

export function ConfirmPill({
  request, busy = false, onConfirm, onCancel,
}: {
  request: ConfirmPillRequest | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Measure after render, then clamp so the pill never leaves the viewport.
  // Preferred placement is centered under the cursor; flips above when the
  // click is near the bottom edge.
  useLayoutEffect(() => {
    if (!request || !ref.current) { setPos(null); return; }
    const { width, height } = ref.current.getBoundingClientRect();
    let left = request.x - width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE));
    let top = request.y + OFFSET;
    if (top + height > window.innerHeight - EDGE) top = request.y - height - OFFSET;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE));
    setPos({ left, top });
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    };
    // Capture-phase pointerdown so a click anywhere (including other
    // stopPropagation-happy widgets) dismisses; scroll dismisses rather
    // than leaving the pill floating over the wrong row.
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onCancel, true);
    window.addEventListener('resize', onCancel);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onCancel, true);
      window.removeEventListener('resize', onCancel);
    };
  }, [request, onCancel]);

  if (!request) return null;

  return createPortal(
    <div
      ref={ref}
      role="alertdialog"
      aria-label={request.message}
      className="fixed z-[100] flex items-center gap-2 rounded-full border border-border bg-popover text-popover-foreground py-1.5 pl-4 pr-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
      style={{
        left: pos?.left ?? request.x,
        top: pos?.top ?? request.y,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <span className="text-sm whitespace-nowrap">{request.message}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 rounded-full px-3"
        onClick={onCancel}
        autoFocus
      >
        Cancel
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="h-8 rounded-full px-3"
        disabled={busy}
        onClick={onConfirm}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (request.confirmLabel ?? 'Delete')}
      </Button>
    </div>,
    document.body,
  );
}
