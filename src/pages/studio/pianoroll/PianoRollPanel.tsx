// Docked piano-roll editor — opens below Smart Controls when a MIDI clip
// is selected. Canvas-rendered (like PeaksCanvas): one sticky canvas
// draws the visible window of ruler + keys + note grid; a second canvas
// below is the velocity/CC lane (Tasks 11-12). All note math is pure
// (midiEdit.ts / rollGeometry.ts); edits flow through the session update
// path, which reschedules the engine.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MidiClip, MidiNote, Session } from '@/lib/studio/session';
import { isMidiTrack } from '@/lib/studio/session';
import {
  ROLL_GRIDS, type RollGrid, gridSeconds,
  addNote, moveNotes, resizeNotes, deleteNotes,
} from '@/lib/studio/midiEdit';
import {
  type RollMetrics, PITCH_MAX, ROLL_ROWS, timeToX, pitchToY,
  hitTestNote, notesInRect, xToTime, yToPitch,
} from './rollGeometry';
import { LiveVoices } from '@/lib/studio/engine/liveVoices';

const KEYS_W = 48;      // piano-key gutter
const RULER_H = 20;
const ROW_H = 12;       // px per semitone
const GRID_BODY_H = 300;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const isBlackKey = (p: number) => NOTE_NAMES[p % 12].endsWith('#');
const pitchLabel = (p: number) => `${NOTE_NAMES[p % 12]}${Math.floor(p / 12) - 1}`;

/** Resolve a theme token to a canvas-usable color (tokens are HSL triplets). */
function tokenColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

export interface PianoRollPanelProps {
  session: Session;
  trackId: string;
  clipId: string;
  positionSeconds: number;
  nativeEngine: boolean;
  update: (mut: (s: Session) => Session) => void;
  pushHistory: () => void;         // snapshot BEFORE the first mutation of a gesture
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

export function PianoRollPanel(props: PianoRollPanelProps) {
  const { session, trackId, clipId } = props;
  const track = session.tracks.find((t) => t.id === trackId);
  const clip = track && isMidiTrack(track)
    ? track.clips.find((c) => c.id === clipId) ?? null : null;

  const [open, setOpen] = useState(true);
  const [grid, setGrid] = useState<RollGrid>('1/16');
  const [strengthPct, setStrengthPct] = useState(80);
  const [pxPerSecond, setPxPerSecond] = useState(120);
  const [selection, setSelection] = useState<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const metrics: RollMetrics = useMemo(
    () => ({ pxPerSecond, rowHeight: ROW_H }), [pxPerSecond]);
  const gridSec = clip ? gridSeconds(grid, session.tempo_bpm) : 0;

  /** One history-free clip mutation; gestures call pushHistory() once first. */
  const editClip = (mut: (c: MidiClip) => MidiClip) => props.update((s) => ({
    ...s,
    tracks: s.tracks.map((t) => t.id !== trackId || !isMidiTrack(t) ? t : {
      ...t, clips: t.clips.map((c) => c.id === clipId ? mut(c) : c),
    }),
  }));

  // ── Audition (web engine only) ─────────────────────────────────────
  const auditionRef = useRef<LiveVoices | null>(null);
  useEffect(() => () => { auditionRef.current?.dispose(); auditionRef.current = null; }, []);
  const audition = (pitch: number, velocity: number) => {
    if (props.nativeEngine || !track || !isMidiTrack(track)) return;
    if (!auditionRef.current) auditionRef.current = new LiveVoices();
    auditionRef.current.setInstrument(track.instrument);
    auditionRef.current.setStrip({ volume_db: track.volume_db, pan: track.pan, mute: track.mute });
    auditionRef.current.noteOn(pitch, velocity / 127);
    window.setTimeout(() => auditionRef.current?.noteOff(pitch), 250);
  };

  // ── Pointer tool: select, marquee, move, resize, create ─────────────
  type Drag =
    | { kind: 'move'; startCx: number; startCy: number; orig: MidiNote[]; sel: number[]; moved: boolean }
    | { kind: 'resize'; edge: 'left' | 'right'; startCx: number; orig: MidiNote[] | null; sel: number[] }
    | { kind: 'marquee'; startCx: number; startCy: number; cx: number; cy: number; base: number[] };
  const dragRef = useRef<Drag | null>(null);

  /** Pointer event → content-space coords + which chrome region it hit. */
  const contentPos = (e: React.PointerEvent): { cx: number; cy: number; region: 'ruler' | 'keys' | 'grid' } => {
    const holder = scrollRef.current!;
    const rect = holder.getBoundingClientRect();
    const vx = e.clientX - rect.left, vy = e.clientY - rect.top;
    const region = vy < RULER_H ? 'ruler' : vx < KEYS_W ? 'keys' : 'grid';
    return { cx: vx - KEYS_W + holder.scrollLeft, cy: vy - RULER_H + holder.scrollTop, region };
  };

  const snapMod = (e: { altKey: boolean }) => (e.altKey ? 0 : gridSec);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!clip || e.button !== 0) return;
    scrollRef.current?.focus();
    const { cx, cy, region } = contentPos(e);
    if (region === 'ruler') { props.onSeek(clip.start_seconds + xToTime(metrics, cx)); return; }
    if (region === 'keys') { audition(yToPitch(metrics, cy), 100); return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const hit = hitTestNote(metrics, clip.notes, cx, cy);
    if (hit) {
      const already = selection.includes(hit.index);
      const sel = e.shiftKey
        ? (already ? selection.filter((i) => i !== hit.index) : [...selection, hit.index])
        : (already ? selection : [hit.index]);
      setSelection(sel);
      if (!e.shiftKey) audition(clip.notes[hit.index].pitch, clip.notes[hit.index].velocity);
      props.pushHistory();
      dragRef.current = hit.zone === 'body'
        ? { kind: 'move', startCx: cx, startCy: cy, orig: clip.notes, sel, moved: false }
        : { kind: 'resize', edge: hit.zone, startCx: cx, orig: clip.notes, sel };
      return;
    }
    if (e.detail === 2) { // double-click empty: create a note at grid length
      props.pushHistory();
      const start = snapAbsForClip(xToTime(metrics, cx));
      const dur = gridSec > 0 ? gridSec : 0.25;
      let created = -1;
      editClip((c) => {
        const r = addNote(c.notes, { pitch: yToPitch(metrics, cy), velocity: 100, start_seconds: start, duration_seconds: dur });
        created = r.index;
        return { ...c, notes: r.notes, duration_seconds: Math.max(c.duration_seconds, start + dur) };
      });
      setSelection(created >= 0 ? [created] : []);
      return;
    }
    dragRef.current = { kind: 'marquee', startCx: cx, startCy: cy, cx, cy, base: e.shiftKey ? selection : [] };
    if (!e.shiftKey) setSelection([]);
  };

  /** Snap a clip-relative time onto the TIMELINE grid (matches quantize). */
  const snapAbsForClip = (t: number): number => {
    if (gridSec <= 0 || !clip) return Math.max(0, t);
    const abs = clip.start_seconds + t;
    return Math.max(0, Math.round(abs / gridSec) * gridSec - clip.start_seconds);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !clip) return;
    const { cx, cy } = contentPos(e);
    if (d.kind === 'move') {
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      const deltaSemitones = -Math.round((cy - d.startCy) / ROW_H);
      if (!d.moved && Math.abs(cx - d.startCx) < 3 && Math.abs(cy - d.startCy) < 3) return;
      d.moved = true;
      editClip((c) => ({ ...c, notes: moveNotes(d.orig, d.sel, {
        deltaSeconds, deltaSemitones, gridSeconds: snapMod(e), clipStartSeconds: c.start_seconds }) }));
    } else if (d.kind === 'resize') {
      if (!d.orig) d.orig = clip.notes;
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      editClip((c) => ({ ...c, notes: resizeNotes(d.orig!, d.sel, {
        edge: d.edge, deltaSeconds, gridSeconds: snapMod(e), clipStartSeconds: c.start_seconds }) }));
    } else {
      d.cx = cx; d.cy = cy;
      setSelection([...new Set([...d.base, ...notesInRect(metrics, clip.notes,
        { x0: d.startCx, y0: d.startCy, x1: cx, y1: cy })])]);
      scheduleDraw();
    }
  };

  const onPointerUp = () => { dragRef.current = null; scheduleDraw(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // The panel owns keys while focused — never let Delete bubble to the
    // editor's clip-delete shortcut.
    e.stopPropagation();
    if (!clip) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault();
      props.pushHistory();
      editClip((c) => ({ ...c, notes: deleteNotes(c.notes, selection) }));
      setSelection([]);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelection(clip.notes.map((_, i) => i));
    } else if (e.key === 'Escape') {
      setSelection([]);
    }
  };

  // ── Drawing ─────────────────────────────────────────────────────────
  const scheduleDraw = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; draw(); });
  };

  const draw = () => {
    const canvas = canvasRef.current, holder = scrollRef.current;
    if (!canvas || !holder || !clip) return;
    const dpr = window.devicePixelRatio || 1;
    const vw = holder.clientWidth, vh = holder.clientHeight;
    if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) {
      canvas.width = vw * dpr; canvas.height = vh * dpr;
      canvas.style.width = `${vw}px`; canvas.style.height = `${vh}px`;
    }
    const sx = holder.scrollLeft, sy = holder.scrollTop;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cBg = tokenColor(holder, '--card', '#111');
    const cMuted = tokenColor(holder, '--muted', '#222');
    const cBorder = tokenColor(holder, '--border', '#333');
    const cFg = tokenColor(holder, '--foreground', '#eee');
    const cSub = tokenColor(holder, '--muted-foreground', '#999');
    const cPrimary = tokenColor(holder, '--primary', '#7c3aed');
    g.fillStyle = cBg; g.fillRect(0, 0, vw, vh);

    const secondsPerBeat = 60 / session.tempo_bpm;
    const beatsPerBar = session.time_signature.numerator;

    // Note grid region: rows + gridlines + notes, offset by scroll.
    g.save();
    g.beginPath(); g.rect(KEYS_W, RULER_H, vw - KEYS_W, vh - RULER_H); g.clip();
    g.translate(KEYS_W - sx, RULER_H - sy);
    // Row shading (black keys darker) across the clip width.
    const totalW = timeToX(metrics, clip.duration_seconds);
    for (let p = 0; p <= PITCH_MAX; p++) {
      if (!isBlackKey(p)) continue;
      g.fillStyle = cMuted;
      g.globalAlpha = 0.35;
      g.fillRect(0, pitchToY(metrics, p), totalW, ROW_H);
      g.globalAlpha = 1;
    }
    // Octave lines (each C) + vertical grid/beat/bar lines. Vertical
    // lines are TIMELINE-anchored: line positions in clip time are
    // (k*grid − clip.start) so they match what quantize snaps to.
    const totalH = ROLL_ROWS * ROW_H;
    for (let p = 0; p <= PITCH_MAX; p += 12) {
      g.strokeStyle = cBorder; g.globalAlpha = 0.8;
      const y = pitchToY(metrics, p) + ROW_H;
      g.beginPath(); g.moveTo(0, y); g.lineTo(totalW, y); g.stroke(); g.globalAlpha = 1;
    }
    const drawVerticals = (stepSec: number, alpha: number) => {
      if (stepSec <= 0 || stepSec * metrics.pxPerSecond < 4) return;
      const firstAbs = Math.ceil(clip.start_seconds / stepSec) * stepSec;
      for (let abs = firstAbs; abs <= clip.start_seconds + clip.duration_seconds; abs += stepSec) {
        const x = timeToX(metrics, abs - clip.start_seconds);
        g.strokeStyle = cBorder; g.globalAlpha = alpha;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, totalH); g.stroke(); g.globalAlpha = 1;
      }
    };
    drawVerticals(gridSec, 0.25);
    drawVerticals(secondsPerBeat, 0.5);
    drawVerticals(secondsPerBeat * beatsPerBar, 1);
    // Notes — velocity as alpha, selection ringed in foreground color.
    const selSet = new Set(selection);
    clip.notes.forEach((n, i) => {
      const x = timeToX(metrics, n.start_seconds);
      const w = Math.max(3, timeToX(metrics, n.duration_seconds));
      const y = pitchToY(metrics, n.pitch);
      g.fillStyle = cPrimary;
      g.globalAlpha = 0.35 + 0.65 * (n.velocity / 127);
      g.fillRect(x, y + 1, w, ROW_H - 2);
      g.globalAlpha = 1;
      if (selSet.has(i)) {
        g.strokeStyle = cFg; g.lineWidth = 1.5;
        g.strokeRect(x + 0.5, y + 1.5, w - 1, ROW_H - 3);
        g.lineWidth = 1;
      }
    });
    // Marquee selection overlay.
    const d = dragRef.current;
    if (d && d.kind === 'marquee') {
      g.strokeStyle = cFg; g.globalAlpha = 0.7; g.setLineDash([4, 3]);
      g.strokeRect(Math.min(d.startCx, d.cx) + 0.5, Math.min(d.startCy, d.cy) + 0.5,
        Math.abs(d.cx - d.startCx), Math.abs(d.cy - d.startCy));
      g.setLineDash([]); g.globalAlpha = 1;
    }
    // Playhead (clip-relative).
    const ph = props.positionSeconds - clip.start_seconds;
    if (ph >= 0 && ph <= clip.duration_seconds) {
      const x = timeToX(metrics, ph);
      g.strokeStyle = cFg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, totalH); g.stroke();
    }
    g.restore();

    // Keys gutter (sticky left, scrolls vertically only).
    g.save();
    g.beginPath(); g.rect(0, RULER_H, KEYS_W, vh - RULER_H); g.clip();
    g.translate(0, RULER_H - sy);
    for (let p = 0; p <= PITCH_MAX; p++) {
      const y = pitchToY(metrics, p);
      g.fillStyle = isBlackKey(p) ? cMuted : cBg;
      g.fillRect(0, y, KEYS_W, ROW_H);
      g.strokeStyle = cBorder; g.globalAlpha = 0.4;
      g.strokeRect(0.5, y + 0.5, KEYS_W - 1, ROW_H); g.globalAlpha = 1;
      if (p % 12 === 0) {
        g.fillStyle = cSub; g.font = '9px ui-monospace, monospace';
        g.fillText(pitchLabel(p), 4, y + ROW_H - 3);
      }
    }
    g.restore();

    // Ruler (sticky top, scrolls horizontally only): absolute bars.
    g.save();
    g.beginPath(); g.rect(KEYS_W, 0, vw - KEYS_W, RULER_H); g.clip();
    g.translate(KEYS_W - sx, 0);
    g.fillStyle = cMuted; g.fillRect(sx - KEYS_W, 0, vw, RULER_H);
    const barSec = secondsPerBeat * beatsPerBar;
    const firstBarAbs = Math.ceil(clip.start_seconds / barSec) * barSec;
    for (let abs = firstBarAbs; abs <= clip.start_seconds + clip.duration_seconds; abs += barSec) {
      const x = timeToX(metrics, abs - clip.start_seconds);
      g.strokeStyle = cBorder;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, RULER_H); g.stroke();
      g.fillStyle = cSub; g.font = '9px ui-monospace, monospace';
      g.fillText(String(Math.round(abs / barSec) + 1), x + 3, 13);
    }
    g.restore();
    // Corner mask above the keys.
    g.fillStyle = cMuted; g.fillRect(0, 0, KEYS_W, RULER_H);
    g.strokeStyle = cBorder;
    g.beginPath(); g.moveTo(0, RULER_H - 0.5); g.lineTo(vw, RULER_H - 0.5); g.stroke();
  };

  // Redraw on any input change; keep the playhead moving.
  useEffect(() => { scheduleDraw(); });
  // Auto-center the pitch content on open / clip switch.
  useEffect(() => {
    const holder = scrollRef.current;
    if (!holder || !clip) return;
    const pitches = clip.notes.map((n) => n.pitch);
    const mid = pitches.length ? (Math.min(...pitches) + Math.max(...pitches)) / 2 : 60;
    holder.scrollTop = Math.max(0, pitchToY(metrics, Math.round(mid)) - (holder.clientHeight - RULER_H) / 2);
    setSelection([]);
  }, [clipId]);

  if (!clip) return null;
  const totalW = KEYS_W + Math.ceil(clip.duration_seconds * pxPerSecond) + 200; // headroom to draw past the end
  const totalH = RULER_H + ROLL_ROWS * ROW_H;

  return (
    <div className="bg-card border border-border rounded-md" data-testid="piano-roll-panel">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 text-sm">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? '▾' : '▸'}
        </button>
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">Piano roll</span>
        <span className="text-xs text-muted-foreground">· {track?.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setPxPerSecond((z) => Math.max(30, z / 1.5))}
            className="text-xs px-1.5 py-0.5 border border-border bg-muted hover:bg-muted/70" title="Zoom out">−</button>
          <button onClick={() => setPxPerSecond((z) => Math.min(1000, z * 1.5))}
            className="text-xs px-1.5 py-0.5 border border-border bg-muted hover:bg-muted/70" title="Zoom in">+</button>
          <button onClick={props.onClose} className="text-xs px-1.5 py-0.5 text-muted-foreground hover:text-foreground" title="Close">×</button>
        </div>
      </div>
      {open && (
        <>
          {/* Toolbar — tools + quantize land in Tasks 10-12. */}
          <div className="px-3 py-1 border-b border-border flex items-center gap-2 text-xs flex-wrap" data-roll-toolbar>
            <label className="text-muted-foreground">Grid</label>
            <select value={grid} onChange={(e) => setGrid(e.target.value as RollGrid)}
              className="border border-border bg-background px-1 py-0.5 text-xs">
              {ROLL_GRIDS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <label className="text-muted-foreground">Strength</label>
            <input type="range" min={10} max={100} step={10} value={strengthPct}
              onChange={(e) => setStrengthPct(Number(e.target.value))}
              className="w-20 h-1 accent-primary" />
            <span className="font-mono tabular-nums w-8">{strengthPct}%</span>
          </div>
          <div
            ref={scrollRef}
            className="relative overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ height: GRID_BODY_H }}
            tabIndex={0}
            onScroll={scheduleDraw}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <div style={{ width: totalW, height: totalH }} />
            {/* Sticky canvas: kept `position: sticky` per the plan brief
             * (matches PeaksCanvas' proven approach for a fixed-viewport
             * canvas over a scrolling spacer). Visual verification is
             * consolidated in a later task — if sticky misbehaves inside
             * this flex layout, swap to `position: absolute` with
             * left/top driven by scrollLeft/scrollTop in draw(). */}
            <canvas ref={canvasRef} className="sticky top-0 left-0 block" style={{ position: 'sticky' }} />
          </div>
        </>
      )}
    </div>
  );
}
