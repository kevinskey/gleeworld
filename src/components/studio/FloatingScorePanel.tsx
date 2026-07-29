// Detachable floating PDF panel for the Part Tracks Studio.
//
// Lets a teacher keep the score visible while recording without leaving
// the studio. The panel is fixed-positioned over everything (z-50),
// draggable by its title bar, resizable via the bottom-right grip, and
// remembers its last position/size in localStorage so reopening it lands
// it back where the user parked it. Click "× / minimize" to close OR
// shrink to a small pill that floats in the corner.
//
// Inside the panel we mount the same PDFViewerWithAnnotations the full
// Viewer uses, just sized to the panel's content area.

import { useEffect, useRef, useState } from 'react';
import {
  GripHorizontal, Minimize2, Maximize2, X, ExternalLink, PictureInPicture2,
  PanelBottomOpen, PanelBottomClose,
} from 'lucide-react';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface FloatingScorePanelProps {
  pdfUrl: string;
  musicId: string;
  musicTitle?: string | null;
  onClose: () => void;
}

interface PanelRect { left: number; top: number; width: number; height: number }

const STORAGE_KEY = 'gw_pt_floating_score_rect';
// Docked-to-bottom mode (iPad recording flow): the score pins full-width
// above the transport bar so the singer reads while tracking, no window
// juggling. Both the mode and the chosen height persist.
const DOCK_KEY = 'gw_pt_floating_score_docked';
const DOCK_H_KEY = 'gw_pt_floating_score_dock_h';
const MIN_W = 280;
const MIN_H = 200;

function loadRect(): PanelRect {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PanelRect;
  } catch { /* ignore */ }
  // Default: top-right corner, ~40% of viewport.
  const w = Math.min(window.innerWidth * 0.4, 640);
  const h = Math.min(window.innerHeight * 0.6, 720);
  return {
    left: window.innerWidth - w - 16,
    top: 80,
    width: w,
    height: h,
  };
}

function saveRect(r: PanelRect) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

export function FloatingScorePanel({ pdfUrl, musicId, musicTitle, onClose }: FloatingScorePanelProps) {
  const [rect, setRect] = useState<PanelRect>(() => loadRect());
  const [minimized, setMinimized] = useState(false);
  const [docked, setDocked] = useState<boolean>(() => {
    try { return localStorage.getItem(DOCK_KEY) === '1'; } catch { return false; }
  });
  const [dockHeight, setDockHeight] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(DOCK_H_KEY));
      if (Number.isFinite(v) && v >= MIN_H) return v;
    } catch { /* ignore */ }
    return Math.round(window.innerHeight * 0.42);
  });
  // Tracks an in-progress drag/resize so the corresponding pointer-move
  // handler can update the rect on every frame.
  const opRef = useRef<
    | { kind: 'drag'; startX: number; startY: number; origLeft: number; origTop: number }
    | { kind: 'resize'; startX: number; startY: number; origW: number; origH: number }
    | { kind: 'dockResize'; startY: number; origH: number }
    | null
  >(null);

  // Persist whenever the rect settles.
  useEffect(() => { saveRect(rect); }, [rect]);
  useEffect(() => {
    try { localStorage.setItem(DOCK_KEY, docked ? '1' : '0'); } catch { /* ignore */ }
  }, [docked]);
  useEffect(() => {
    try { localStorage.setItem(DOCK_H_KEY, String(dockHeight)); } catch { /* ignore */ }
  }, [dockHeight]);

  // Clamp panel to viewport on resize so a smaller window can't strand
  // it off-screen.
  useEffect(() => {
    const onResize = () => {
      setRect((r) => {
        const maxLeft = Math.max(0, window.innerWidth - r.width);
        const maxTop  = Math.max(0, window.innerHeight - 60);
        return {
          left: Math.min(Math.max(0, r.left), maxLeft),
          top:  Math.min(Math.max(0, r.top), maxTop),
          width:  Math.min(r.width,  window.innerWidth),
          height: Math.min(r.height, window.innerHeight),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    if (minimized) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    opRef.current = {
      kind: 'drag',
      startX: e.clientX, startY: e.clientY,
      origLeft: rect.left, origTop: rect.top,
    };
  };
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    opRef.current = {
      kind: 'resize',
      startX: e.clientX, startY: e.clientY,
      origW: rect.width, origH: rect.height,
    };
  };
  const startDockResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    opRef.current = { kind: 'dockResize', startY: e.clientY, origH: dockHeight };
  };
  const onMove = (e: React.PointerEvent) => {
    const op = opRef.current;
    if (!op) return;
    if (op.kind === 'dockResize') {
      // Dragging the top edge UP grows the docked panel.
      const dy = e.clientY - op.startY;
      setDockHeight(Math.max(MIN_H, Math.min(Math.round(window.innerHeight * 0.8), op.origH - dy)));
      return;
    }
    const dx = e.clientX - op.startX;
    const dy = e.clientY - op.startY;
    if (op.kind === 'drag') {
      setRect((r) => ({
        ...r,
        left: Math.max(0, Math.min(window.innerWidth - r.width, op.origLeft + dx)),
        top:  Math.max(0, Math.min(window.innerHeight - 40,    op.origTop + dy)),
      }));
    } else {
      setRect((r) => ({
        ...r,
        width:  Math.max(MIN_W, Math.min(window.innerWidth - r.left, op.origW + dx)),
        height: Math.max(MIN_H, Math.min(window.innerHeight - r.top, op.origH + dy)),
      }));
    }
  };
  const endOp = () => { opRef.current = null; };

  // Minimized = small pill in the bottom-right corner that re-opens
  // the panel when clicked. Keeps the floating score one tap away
  // without covering the studio.
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-full shadow-xl px-4 py-2 text-sm font-medium hover:shadow-2xl transition-shadow flex items-center gap-2"
        title="Restore score panel"
      >
        <Maximize2 className="w-4 h-4 text-primary" />
        <span className="truncate max-w-[200px]">{musicTitle ?? 'Score'}</span>
      </button>
    );
  }

  return (
    <div
      className={
        docked
          // Docked: full-width sheet pinned above the transport bar
          // (which sits at bottom-12 + its own height on phones, bottom-0
          // on md+). The score stays readable while the user records.
          ? 'fixed z-50 bg-card border-t border-border rounded-t-lg shadow-2xl overflow-hidden flex flex-col inset-x-0 bottom-32 md:bottom-20'
          : 'fixed z-50 bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col'
      }
      style={docked
        ? { height: dockHeight }
        : { left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerMove={onMove}
      onPointerUp={endOp}
      onPointerCancel={endOp}
    >
      {/* Docked: top-edge grip to drag the sheet taller/shorter. */}
      {docked && (
        <div
          onPointerDown={startDockResize}
          className="absolute top-0 inset-x-0 h-2.5 cursor-ns-resize z-10"
          style={{ touchAction: 'none' }}
          aria-label="Resize score height"
        >
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-muted-foreground/40" />
        </div>
      )}
      {/* Drag handle / title bar (drag disabled while docked) */}
      <div
        onPointerDown={docked ? undefined : startDrag}
        className={`flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40 select-none ${docked ? '' : 'cursor-move'}`}
        style={{ touchAction: 'none' }}
      >
        <GripHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="text-sm font-semibold truncate flex-1">{musicTitle ?? 'Score'}</div>
        <button
          type="button"
          onClick={() => setDocked((d) => !d)}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title={docked ? 'Float the score panel' : 'Dock score to the bottom of the screen'}
          aria-label={docked ? 'Float the score panel' : 'Dock score to the bottom of the screen'}
        >
          {docked ? <PanelBottomClose className="w-4 h-4" /> : <PanelBottomOpen className="w-4 h-4" />}
        </button>
        {/* Pop the score out as its OWN browser window. Lets the user
            drag it to a second monitor (or just to a separate desktop
            space) so the score lives independently of the studio tab.
            Falls back to a same-tab navigation if the popup is blocked
            (iOS WKWebView doesn't grant cross-window windows). */}
        <button
          type="button"
          onClick={() => {
            const url = `/dashboard/viewer/${musicId}?popout=1`;
            const features = `popup=yes,width=${Math.min(window.screen.availWidth, 900)},height=${Math.min(window.screen.availHeight, 1100)},left=${Math.max(0, (window.screen.availWidth - 900) / 2)},top=80,resizable=yes,scrollbars=yes`;
            const w = window.open(url, 'gw_score_popout', features);
            if (!w) {
              toast.message('Popup blocked', {
                description: 'Allow popups for GleeWorld to open the score in its own window. Opening in a new tab instead.',
              });
              window.open(url, '_blank', 'noopener');
              return;
            }
            try { w.focus(); } catch { /* ignore */ }
            // Hand-off: close the floating panel so it doesn't double
            // up with the dedicated window. The user can reopen by
            // clicking "Open score" again.
            onClose();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Pop out to its own window"
          aria-label="Pop out to its own window"
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>
        <Link
          to={`/dashboard/viewer/${musicId}`}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Open in full Viewer (this tab)"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Minimize"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-rose-500"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* PDF viewer fills the remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PDFViewerWithAnnotations
          pdfUrl={pdfUrl}
          musicId={musicId}
          musicTitle={musicTitle ?? undefined}
          chromeless
          className="h-full"
        />
      </div>

      {/* Resize grip — bottom-right corner (floating mode only; docked
          mode resizes via the top-edge grip instead). */}
      {!docked && (
        <div
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{ touchAction: 'none' }}
          aria-label="Resize"
        >
          <svg viewBox="0 0 16 16" className="w-full h-full opacity-60" aria-hidden="true">
            <path d="M14 14L10 14M14 14L14 10M14 14L6 6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
