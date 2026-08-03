// SVG canvas with pan/zoom, click/box selection, and drag-to-move.
// Works on desktop (mouse), iPad (touch), and phone (view + tap).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';
import type { AttendanceStatus } from '../attendance/attendanceStatus';
import ObjectShape from './ObjectShape';
import { snap } from './selectionUtils';

export interface CanvasEngineProps {
  width: number;
  height: number;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onObjectMove: (id: string, x: number, y: number) => void;
  onObjectDropPerson?: (objectId: string, profileId: string, displayName: string) => void;
  readOnly?: boolean;
  showGrid?: boolean;
  /** Optional: attendance status per profile_id, keyed to assignment.profile_id */
  attendanceByUserId?: Map<string, AttendanceStatus>;
  /** Optional filter to hide objects (used by role views like stage_crew). */
  objectFilter?: (o: SeatingObject) => boolean;
}

interface ViewportState {
  scale: number;
  panX: number;
  panY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const DEFAULT_SCALE = 0.7;

// Fit the whole chart inside `containerRect` with a small margin, then clamp
// to [MIN_SCALE, MAX_SCALE]. Used on first render + on "Reset view".
function fitScale(chartW: number, chartH: number, containerW: number, containerH: number): { scale: number; panX: number; panY: number } {
  const margin = 24;
  const availW = Math.max(1, containerW - margin * 2);
  const availH = Math.max(1, containerH - margin * 2);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(availW / chartW, availH / chartH)));
  const panX = margin + (availW - chartW * scale) / 2;
  const panY = margin + (availH - chartH * scale) / 2;
  return { scale, panX, panY };
}

export function CanvasEngine({
  width, height, objects, assignments,
  selectedIds, onSelectionChange, onObjectMove, onObjectDropPerson,
  readOnly = false, showGrid = true,
  attendanceByUserId, objectFilter,
}: CanvasEngineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // True once the user has panned/zoomed — auto-fit stands down from then on.
  const userAdjustedRef = useRef(false);
  const [viewport, setViewport] = useState<ViewportState>({ scale: DEFAULT_SCALE, panX: 40, panY: 40 });
  const [dragState, setDragState] = useState<
    | { kind: 'none' }
    | { kind: 'move'; startX: number; startY: number; origin: Map<string, { x: number; y: number }> }
    | { kind: 'pan'; startX: number; startY: number; origPan: { x: number; y: number } }
    | { kind: 'select'; startX: number; startY: number; currentX: number; currentY: number }
  >({ kind: 'none' });

  // Active touch points, keyed by pointerId. Used for pinch-zoom + two-finger
  // pan on iPhone / iPad. When two touches are down we suppress single-pointer
  // drag / select and drive the viewport directly.
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    startDist: number;
    startCenterX: number;
    startCenterY: number;
    startScale: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const assignmentByObjectId = useMemo(() => {
    const m = new Map<string, SeatingAssignment>();
    assignments.forEach((a) => m.set(a.chart_object_id, a));
    return m;
  }, [assignments]);

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - viewport.panX) / viewport.scale,
      y: (clientY - rect.top - viewport.panY) / viewport.scale,
    };
  }, [viewport]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly && e.pointerType !== 'touch') return;
    (e.target as SVGElement).setPointerCapture?.(e.pointerId);

    // Multi-touch: track every touch pointer. When the second touch lands we
    // start a pinch gesture and cancel any single-touch drag in progress.
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchesRef.current.size === 2) {
        const pts = Array.from(touchesRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        gestureRef.current = {
          startDist: Math.hypot(dx, dy),
          startCenterX: (pts[0].x + pts[1].x) / 2,
          startCenterY: (pts[0].y + pts[1].y) / 2,
          startScale: viewport.scale,
          startPanX: viewport.panX,
          startPanY: viewport.panY,
        };
        setDragState({ kind: 'none' });
        return;
      }
    }

    if (readOnly) return;
    const target = e.target as SVGElement;
    const objectId = target.closest('[data-object-id]')?.getAttribute('data-object-id') ?? null;
    const canvasPt = clientToCanvas(e.clientX, e.clientY);

    // Space / middle-click / single-touch on empty canvas → pan.
    if (e.button === 1 || (e.pointerType === 'touch' && objectId === null)) {
      setDragState({ kind: 'pan', startX: e.clientX, startY: e.clientY, origPan: { x: viewport.panX, y: viewport.panY } });
      return;
    }

    if (objectId) {
      const obj = objects.find((o) => o.id === objectId);
      if (obj?.locked) return;
      let nextSelected = selectedIds;
      if (!selectedIds.includes(objectId)) {
        nextSelected = e.shiftKey ? [...selectedIds, objectId] : [objectId];
        onSelectionChange(nextSelected);
      }
      const origin = new Map<string, { x: number; y: number }>();
      objects.forEach((o) => {
        if (nextSelected.includes(o.id)) origin.set(o.id, { x: Number(o.x), y: Number(o.y) });
      });
      setDragState({ kind: 'move', startX: canvasPt.x, startY: canvasPt.y, origin });
    } else {
      // Box-select
      onSelectionChange([]);
      setDragState({ kind: 'select', startX: canvasPt.x, startY: canvasPt.y, currentX: canvasPt.x, currentY: canvasPt.y });
    }
  }, [readOnly, clientToCanvas, viewport.panX, viewport.panY, objects, selectedIds, onSelectionChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Multi-touch: update touch registry + drive pinch/pan directly.
    if (e.pointerType === 'touch' && touchesRef.current.has(e.pointerId)) {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gestureRef.current && touchesRef.current.size === 2) {
        const pts = Array.from(touchesRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const g = gestureRef.current;
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.startScale * (dist / g.startDist)));
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const px = g.startCenterX - rect.left;
        const py = g.startCenterY - rect.top;
        // Zoom around the initial pinch center, then translate by the pinch's
        // own drift so two-finger drag also pans the canvas.
        const scaledPanX = px - ((px - g.startPanX) / g.startScale) * nextScale;
        const scaledPanY = py - ((py - g.startPanY) / g.startScale) * nextScale;
        userAdjustedRef.current = true;
        setViewport({
          scale: nextScale,
          panX: scaledPanX + (cx - g.startCenterX),
          panY: scaledPanY + (cy - g.startCenterY),
        });
        return;
      }
    }

    if (dragState.kind === 'none') return;
    const canvasPt = clientToCanvas(e.clientX, e.clientY);
    if (dragState.kind === 'move') {
      const dx = canvasPt.x - dragState.startX;
      const dy = canvasPt.y - dragState.startY;
      dragState.origin.forEach((origin, id) => {
        onObjectMove(id, snap(origin.x + dx), snap(origin.y + dy));
      });
    } else if (dragState.kind === 'pan') {
      userAdjustedRef.current = true;
      setViewport((v) => ({
        ...v,
        panX: dragState.origPan.x + (e.clientX - dragState.startX),
        panY: dragState.origPan.y + (e.clientY - dragState.startY),
      }));
    } else if (dragState.kind === 'select') {
      setDragState({ ...dragState, currentX: canvasPt.x, currentY: canvasPt.y });
      const x = Math.min(dragState.startX, canvasPt.x);
      const y = Math.min(dragState.startY, canvasPt.y);
      const w = Math.abs(dragState.startX - canvasPt.x);
      const h = Math.abs(dragState.startY - canvasPt.y);
      const inside = objects
        .filter((o) => {
          const cx = Number(o.x) + Number(o.width) / 2;
          const cy = Number(o.y) + Number(o.height) / 2;
          return cx >= x && cx <= x + w && cy >= y && cy <= y + h && !o.locked;
        })
        .map((o) => o.id);
      onSelectionChange(inside);
    }
  }, [dragState, clientToCanvas, objects, onObjectMove, onSelectionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.delete(e.pointerId);
      if (touchesRef.current.size < 2) gestureRef.current = null;
    }
    setDragState({ kind: 'none' });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    userAdjustedRef.current = true;
    setViewport((v) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
      // Zoom around the cursor
      const nextPanX = px - ((px - v.panX) / v.scale) * nextScale;
      const nextPanY = py - ((py - v.panY) / v.scale) * nextScale;
      return { scale: nextScale, panX: nextPanX, panY: nextPanY };
    });
  }, []);

  const handleDropZone = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const person = e.dataTransfer.getData('application/x-seating-person');
    if (!person || !onObjectDropPerson) return;
    const parsed = JSON.parse(person) as { profileId: string; displayName: string };
    const canvasPt = clientToCanvas(e.clientX, e.clientY);
    // Find nearest seat under the pointer.
    const seat = objects.find((o) => {
      const x1 = Number(o.x);
      const y1 = Number(o.y);
      const x2 = x1 + Number(o.width);
      const y2 = y1 + Number(o.height);
      return canvasPt.x >= x1 && canvasPt.x <= x2 && canvasPt.y >= y1 && canvasPt.y <= y2
        && ['seat', 'chair', 'riser_slot', 'desk'].includes(o.object_type);
    });
    if (seat) onObjectDropPerson(seat.id, parsed.profileId, parsed.displayName);
  }, [clientToCanvas, objects, onObjectDropPerson]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Keep the chart fitted to the container until the user pans/zooms
  // themselves. The old fit-once-on-mount ran while the flex layout was
  // still settling, measured a small container, and locked in a tiny
  // chart (panel/sidebar animation finished AFTER the only fit). A
  // ResizeObserver re-fits on every container size change instead —
  // and stands down permanently once the user has adjusted the view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const refit = () => {
      if (userAdjustedRef.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;
      setViewport(fitScale(width, height, rect.width, rect.height));
    };
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const handleReset = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    userAdjustedRef.current = false;
    setViewport(fitScale(width, height, rect.width, rect.height));
  }, [width, height]);

  // +/- buttons zoom around the container center.
  const zoomBy = useCallback((factor: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = rect.width / 2;
    const py = rect.height / 2;
    userAdjustedRef.current = true;
    setViewport((v) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      return {
        scale: nextScale,
        panX: px - ((px - v.panX) / v.scale) * nextScale,
        panY: py - ((py - v.panY) / v.scale) * nextScale,
      };
    });
  }, []);

  // Keyboard: arrow keys nudge selection.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (readOnly) return;
      if (!selectedIds.length) return;
      const active = document.activeElement;
      if (active && active.tagName === 'INPUT') return;
      const delta = e.shiftKey ? 32 : 8;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -delta;
      else if (e.key === 'ArrowDown') dy = delta;
      else if (e.key === 'ArrowLeft') dx = -delta;
      else if (e.key === 'ArrowRight') dx = delta;
      else return;
      e.preventDefault();
      selectedIds.forEach((id) => {
        const o = objects.find((x) => x.id === id);
        if (o) onObjectMove(id, snap(Number(o.x) + dx), snap(Number(o.y) + dy));
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, selectedIds, objects, onObjectMove]);

  const selectRect = dragState.kind === 'select' ? {
    x: Math.min(dragState.startX, dragState.currentX),
    y: Math.min(dragState.startY, dragState.currentY),
    w: Math.abs(dragState.startX - dragState.currentX),
    h: Math.abs(dragState.startY - dragState.currentY),
  } : null;

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 overflow-hidden bg-slate-100"
      onWheel={handleWheel}
      onDrop={handleDropZone}
      onDragOver={handleDragOver}
    >
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.scale})`}>
          {showGrid && (
            <>
              <defs>
                <pattern id="grid8" width={8} height={8} patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x={0} y={0} width={width} height={height} fill="url(#grid8)" />
            </>
          )}
          <rect x={0} y={0} width={width} height={height} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1} />
          {objects
            .slice()
            .filter((o) => (objectFilter ? objectFilter(o) : true))
            .sort((a, b) => a.z_index - b.z_index)
            .map((o) => {
              const a = assignmentByObjectId.get(o.id);
              const status = a?.profile_id ? attendanceByUserId?.get(a.profile_id) : undefined;
              return (
                <ObjectShape
                  key={o.id}
                  object={o}
                  assignment={a}
                  selected={selectedIds.includes(o.id)}
                  attendanceStatus={status}
                />
              );
            })}
          {selectRect && (
            <rect
              x={selectRect.x} y={selectRect.y} width={selectRect.w} height={selectRect.h}
              fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth={1} strokeDasharray="4 4"
            />
          )}
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-card/90 backdrop-blur shadow border px-1 py-1 text-xs text-muted-foreground print:hidden">
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center text-foreground hover:bg-accent text-sm font-semibold"
          onClick={() => zoomBy(1 / 1.25)}
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-10 text-center tabular-nums">{Math.round(viewport.scale * 100)}%</span>
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center text-foreground hover:bg-accent text-sm font-semibold"
          onClick={() => zoomBy(1.25)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="h-8 px-2 inline-flex items-center justify-center text-foreground hover:bg-accent"
          onClick={handleReset}
        >
          Fit
        </button>
      </div>
    </div>
  );
}

export default CanvasEngine;
