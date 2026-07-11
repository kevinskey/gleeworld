// Docked piano-roll editor — opens below Smart Controls when a MIDI clip
// is selected. Canvas-rendered (like PeaksCanvas): one sticky canvas
// draws the visible window of ruler + keys + note grid; a second canvas
// below is the velocity/CC lane (Tasks 11-12). All note math is pure
// (midiEdit.ts / rollGeometry.ts); edits flow through the session update
// path, which reschedules the engine.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MidiClip, MidiNote, MidiCcEvent, Session } from '@/lib/studio/session';
import { isMidiTrack } from '@/lib/studio/session';
import {
  ROLL_GRIDS, type RollGrid, gridSeconds,
  addNote, moveNotes, resizeNotes, deleteNotes,
  quantizeNotes, transposeNotes, offsetVelocity,
  sustainRanges, setSustainRanges, ccPoints, applySustain,
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
const LANE_H = 72;      // velocity/CC lane strip height

export type RollLane = 'velocity' | 'sustain' | 'mod';

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
  // In-flight move/resize preview — never touches history or the engine
  // until the gesture completes (onPointerUp). draw() renders this over
  // clip.notes so the drag feels live; hit-testing on pointerdown still
  // reads clip.notes (gestures always start from committed state).
  const [draftNotes, setDraftNotes] = useState<MidiNote[] | null>(null);
  // Draft-commit preview for CC lane edits (sustain ranges / mod points),
  // mirrors draftNotes: drawLane renders `draftCc ?? clip.cc ?? []` while a
  // gesture is live, and draw()'s ghost tails use the same fallback so the
  // note-tail preview tracks an in-flight sustain edit too.
  const [draftCc, setDraftCc] = useState<MidiCcEvent[] | null>(null);
  const [lane, setLane] = useState<RollLane>('velocity');
  const [selectedRange, setSelectedRange] = useState<number | null>(null);
  const [selectedModPoint, setSelectedModPoint] = useState<number | null>(null);
  const [tool, setTool] = useState<'pointer' | 'pencil'>('pointer');

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laneCanvasRef = useRef<HTMLCanvasElement>(null);
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

  // ── Toolbar ops: one-shot edits, one history entry + one engine reload
  // each (via editClip, same as any other committed mutation). ──────────
  const applyQuantize = () => {
    if (!selection.length || gridSec <= 0 || !clip) return;
    props.pushHistory();
    editClip((c) => ({ ...c, notes: quantizeNotes(c.notes, selection, {
      gridSeconds: gridSec, strength: strengthPct / 100, clipStartSeconds: c.start_seconds }) }));
  };
  const applyTranspose = (semitones: number) => {
    if (!selection.length) return;
    props.pushHistory();
    editClip((c) => ({ ...c, notes: transposeNotes(c.notes, selection, semitones) }));
  };

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
  // Every drag variant carries `pointerId` (multi-pointer safety, Task 12):
  // onPointerUp/onPointerCancel receive the triggering event and only
  // settle the drag whose pointerId matches, so a second touch/pen mid-
  // gesture can't cross-commit or cross-cancel an unrelated drag.
  type Drag =
    | { kind: 'move'; pointerId: number; startCx: number; startCy: number; orig: MidiNote[]; sel: number[]; moved: boolean; draft?: MidiNote[] }
    | { kind: 'resize'; pointerId: number; edge: 'left' | 'right'; startCx: number; orig: MidiNote[] | null; sel: number[]; moved: boolean; draft?: MidiNote[]; skipHistory?: boolean }
    | { kind: 'marquee'; pointerId: number; startCx: number; startCy: number; cx: number; cy: number; base: number[] };
  const dragRef = useRef<Drag | null>(null);

  // ── Velocity lane drag: same draft-commit discipline as move/resize —
  // no history on pointerdown, compute every intermediate frame from the
  // gesture-start snapshot (d.orig), commit d.draft once in the shared
  // onPointerUp. A click with no movement still counts as an edit (it set
  // one bar's velocity to the click position) so `changed` is true as soon
  // as a bar is hit, not gated on a movement threshold like move/resize.
  type LaneDrag = {
    pointerId: number; index: number; inSelection: boolean; orig: MidiNote[]; velAtDown: number;
    draft: MidiNote[] | null; changed: boolean;
  };
  const laneDragRef = useRef<LaneDrag | null>(null);

  // ── CC lane drag (sustain ranges / mod points): same draft-commit
  // discipline — no history on pointerdown, per-move results computed
  // pure from a gesture-start snapshot, one pushHistory + editClip at
  // pointerup from the ref (mirrors LaneDrag/Drag above). `changed` mirrors
  // Drag's `moved`: merely clicking to select a range/point (no drag) must
  // NOT push a no-op history entry, so the commit in onPointerUp is gated
  // on it (unlike the velocity lane, where a click alone already implies a
  // real value change).
  type CcDrag =
    | { kind: 'sus-edge'; pointerId: number; range: number; edge: 'down' | 'up'; ranges: Array<{ down: number; up: number }>; draft: MidiCcEvent[]; changed: boolean }
    | { kind: 'sus-move'; pointerId: number; range: number; startCx: number; ranges: Array<{ down: number; up: number }>; draft: MidiCcEvent[]; changed: boolean }
    | { kind: 'mod'; pointerId: number; index: number; draft: MidiCcEvent[]; changed: boolean };
  const ccDragRef = useRef<CcDrag | null>(null);

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
    if (tool === 'pencil') {
      const hit = hitTestNote(metrics, clip.notes, cx, cy);
      props.pushHistory();
      if (hit) { // pencil-click an existing note deletes it (DAW standard)
        editClip((c) => ({ ...c, notes: deleteNotes(c.notes, [hit.index]) }));
        setSelection([]);
        return;
      }
      const start = snapAbsForClip(xToTime(metrics, cx));
      const dur = gridSec > 0 ? gridSec : 0.25;
      let created = -1;
      let createdNotes: MidiNote[] | null = null;
      editClip((c) => {
        const r = addNote(c.notes, { pitch: yToPitch(metrics, cy), velocity: 100, start_seconds: start, duration_seconds: dur });
        created = r.index;
        createdNotes = r.notes;
        return { ...c, notes: r.notes, duration_seconds: Math.max(c.duration_seconds, start + dur) };
      });
      setSelection(created >= 0 ? [created] : []);
      audition(yToPitch(metrics, cy), 100);
      // Drag-out lengthens the freshly drawn note. The create above is
      // already pushHistory'd + committed (one-shot); this follow-on drag
      // is a normal resize gesture seeded with the post-create notes array
      // (so the freshly-created note has a valid orig snapshot to resize
      // from) but must NOT push a second history entry at ITS pointerup —
      // that would split one pencil stroke into two undo steps. skipHistory
      // is honored in onPointerUp.
      if (created >= 0 && createdNotes) {
        dragRef.current = {
          kind: 'resize', pointerId: e.pointerId, edge: 'right', startCx: cx,
          orig: createdNotes, sel: [created], moved: false, skipHistory: true,
        };
      }
      return;
    }
    const hit = hitTestNote(metrics, clip.notes, cx, cy);
    if (hit) {
      const already = selection.includes(hit.index);
      const sel = e.shiftKey
        ? (already ? selection.filter((i) => i !== hit.index) : [...selection, hit.index])
        : (already ? selection : [hit.index]);
      setSelection(sel);
      if (!e.shiftKey) audition(clip.notes[hit.index].pitch, clip.notes[hit.index].velocity);
      // No pushHistory() here — a plain click (audition, select) must not
      // touch the undo stack. History is recorded once in onPointerUp,
      // only if the gesture actually moved/resized something.
      dragRef.current = hit.zone === 'body'
        ? { kind: 'move', pointerId: e.pointerId, startCx: cx, startCy: cy, orig: clip.notes, sel, moved: false }
        : { kind: 'resize', pointerId: e.pointerId, edge: hit.zone, startCx: cx, orig: clip.notes, sel, moved: false };
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
    dragRef.current = { kind: 'marquee', pointerId: e.pointerId, startCx: cx, startCy: cy, cx, cy, base: e.shiftKey ? selection : [] };
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
    // Multi-pointer safety: a second pointer moving mid-gesture must not
    // steer the first pointer's drag (there's only one dragRef slot).
    if (!d || d.pointerId !== e.pointerId || !clip) return;
    const { cx, cy } = contentPos(e);
    if (d.kind === 'move') {
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      const deltaSemitones = -Math.round((cy - d.startCy) / ROW_H);
      if (!d.moved && Math.abs(cx - d.startCx) < 3 && Math.abs(cy - d.startCy) < 3) return;
      d.moved = true;
      // Draft-only: preview the move without touching history or the
      // engine on every pixel. Committed once in onPointerUp. Stash the
      // same array on the drag ref (d.draft) — state updates are async
      // under the concurrent renderer, so a pointerup that lands before
      // this render flushes would otherwise read a stale/null closure.
      const nextMove = moveNotes(d.orig, d.sel, {
        deltaSeconds, deltaSemitones, gridSeconds: snapMod(e), clipStartSeconds: clip.start_seconds });
      d.draft = nextMove;
      setDraftNotes(nextMove);
    } else if (d.kind === 'resize') {
      if (!d.orig) d.orig = clip.notes;
      if (!d.moved && Math.abs(cx - d.startCx) < 3) return;
      d.moved = true;
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      // Draft-only, same as move — committed once in onPointerUp, ref-fresh.
      const nextResize = resizeNotes(d.orig, d.sel, {
        edge: d.edge, deltaSeconds, gridSeconds: snapMod(e), clipStartSeconds: clip.start_seconds });
      d.draft = nextResize;
      setDraftNotes(nextResize);
    } else {
      d.cx = cx; d.cy = cy;
      setSelection([...new Set([...d.base, ...notesInRect(metrics, clip.notes,
        { x0: d.startCx, y0: d.startCy, x1: cx, y1: cy })])]);
      scheduleDraw();
    }
  };

  // Multi-pointer safety: settle ONLY the drag whose pointerId matches the
  // triggering event, leaving any other in-flight gesture (a second touch/
  // pen down mid-drag) untouched. Each of the three drag refs is checked
  // and cleared independently.
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    // Commit exactly once per completed gesture: one history entry, one
    // engine reload (via editClip → the skeleton sig picks up the note
    // content change). A click with no actual drag (moved === false)
    // commits nothing — see the pointerdown comment on history.
    // Commit from d.draft (the drag ref), not the draftNotes state: state
    // renders (drives the live preview), the ref commits — under React's
    // concurrent renderer a flick can fire pointerup before the last
    // pointermove's setDraftNotes has flushed, so the state closure here
    // may still be null or one move stale while the ref is always current.
    if (d && d.pointerId === e.pointerId) {
      if ((d.kind === 'move' || d.kind === 'resize') && d.moved && d.draft) {
        // skipHistory: the pencil-drawn note that seeds this resize was
        // already pushHistory'd + committed at creation — one pencil
        // stroke must stay ONE undo step, so this commit reuses that
        // entry instead of pushing a second one.
        if (!(d.kind === 'resize' && d.skipHistory)) props.pushHistory();
        const notes = d.draft;
        editClip((c) => ({ ...c, notes }));
      }
      dragRef.current = null;
    }
    // Same discipline for the velocity lane: a click-no-drag on a bar is
    // still one edit (see LaneDrag comment above), so `changed` — not a
    // movement flag — gates the commit here.
    const ld = laneDragRef.current;
    if (ld && ld.pointerId === e.pointerId) {
      if (ld.changed && ld.draft) {
        props.pushHistory();
        const notes = ld.draft;
        editClip((c) => ({ ...c, notes }));
      }
      laneDragRef.current = null;
    }
    // draftNotes is shared between the grid drag (dragRef) and the
    // velocity-lane drag (laneDragRef) previews — only clear it once
    // NEITHER ref still owns an in-flight gesture, so settling one
    // pointer's drag can't stomp a different pointer's still-live preview.
    if (!dragRef.current && !laneDragRef.current) setDraftNotes(null);
    // CC lane (sustain ranges / mod points): same draft-commit discipline
    // as move/resize/lane above — single pushHistory + editClip here.
    const cd = ccDragRef.current;
    if (cd && cd.pointerId === e.pointerId) {
      if (cd.changed) {
        props.pushHistory();
        const cc = cd.draft;
        editClip((c) => ({ ...c, cc }));
      }
      setDraftCc(null);
      ccDragRef.current = null;
    }
    scheduleDraw();
  };

  /** Touch scroll takeover (or any other pointercancel) aborts the
   * gesture without committing — clear the draft so the canvas doesn't
   * keep rendering a phantom in-flight drag. Only the drag matching this
   * event's pointerId is aborted (multi-pointer safety); draftNotes is
   * shared across dragRef/laneDragRef so it's only cleared once neither
   * still owns a live gesture (mirrors onPointerUp). */
  const onPointerCancel = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    if (laneDragRef.current?.pointerId === e.pointerId) laneDragRef.current = null;
    if (!dragRef.current && !laneDragRef.current) setDraftNotes(null);
    if (ccDragRef.current?.pointerId === e.pointerId) { ccDragRef.current = null; setDraftCc(null); }
    scheduleDraw();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // The panel owns keys while focused — never let Delete bubble to the
    // editor's clip-delete shortcut.
    e.stopPropagation();
    if (!clip) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault();
      // Cancel any in-flight drag first: without this, a later pointerup
      // from a drag that was live when Delete fired would commit its
      // (now stale/pre-delete) draft on top of the delete — resurrecting
      // deleted notes and double-writing history.
      dragRef.current = null;
      setDraftNotes(null);
      props.pushHistory();
      editClip((c) => ({ ...c, notes: deleteNotes(c.notes, selection) }));
      setSelection([]);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !selection.length
      && lane === 'sustain' && selectedRange !== null) {
      e.preventDefault();
      ccDragRef.current = null;
      setDraftCc(null);
      props.pushHistory();
      const ranges = sustainRanges(clip.cc ?? [], clip.duration_seconds)
        .filter((_, i) => i !== selectedRange);
      editClip((c) => ({ ...c, cc: setSustainRanges(c.cc ?? [], ranges) }));
      setSelectedRange(null);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !selection.length
      && lane === 'mod' && selectedModPoint !== null) {
      e.preventDefault();
      ccDragRef.current = null;
      setDraftCc(null);
      props.pushHistory();
      const target = ccPoints(clip.cc ?? [], 1)[selectedModPoint];
      if (target) editClip((c) => ({ ...c, cc: (c.cc ?? []).filter((_, i) => i !== target.index) }));
      setSelectedModPoint(null);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelection(clip.notes.map((_, i) => i));
    } else if (e.key === 'Escape') {
      // DAW convention: Escape mid-drag aborts the in-flight gesture (clear
      // refs + drafts, no commit) rather than clearing selection. Only
      // falls through to the existing clear-selection behavior when no
      // drag is live.
      const hadDrag = dragRef.current || laneDragRef.current || ccDragRef.current;
      if (hadDrag) {
        dragRef.current = null;
        laneDragRef.current = null;
        ccDragRef.current = null;
        setDraftNotes(null);
        setDraftCc(null);
        scheduleDraw();
      } else {
        setSelection([]);
      }
    }
  };

  // ── Velocity lane pointer handlers (velocity only for now; Task 12
  // extends by `lane`). Mirrors move/resize: pointer position at the
  // start of the gesture (velAtDown) is the anchor, every frame recomputes
  // the delta against that anchor and reapplies it to the d.orig snapshot
  // — pure/idempotent, so it doesn't matter how many pointermoves fire. ──
  const lanePos = (e: React.PointerEvent) => {
    const canvas = laneCanvasRef.current!, holder = scrollRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { cx: e.clientX - rect.left + holder.scrollLeft, vy: e.clientY - rect.top };
  };

  const velFromY = (vy: number) => Math.max(1, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));

  /** Selected bar with a multi-note selection: offset the whole selection
   * by the delta since gesture start. Unselected (or lone-selected) bar:
   * set just that note directly to the pointer-implied velocity. */
  const laneVelocityDraft = (d: LaneDrag, vel: number): MidiNote[] => {
    if (d.inSelection && selection.length > 1) {
      return offsetVelocity(d.orig, selection, vel - d.velAtDown);
    }
    return d.orig.map((n, i) => (i === d.index ? { ...n, velocity: vel } : n));
  };

  const onLanePointerDown = (e: React.PointerEvent) => {
    if (!clip || lane !== 'velocity') return;
    const { cx, vy } = lanePos(e);
    // Nearest note whose start bar column is within 4px (topmost wins).
    let index = -1;
    clip.notes.forEach((n, i) => { if (Math.abs(timeToX(metrics, n.start_seconds) - cx) <= 4) index = i; });
    if (index < 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // No pushHistory() here — mirrors the grid's pointerdown: history is
    // recorded once in the shared onPointerUp.
    const vel = velFromY(vy);
    const inSelection = selection.includes(index);
    const d: LaneDrag = { pointerId: e.pointerId, index, inSelection, orig: clip.notes, velAtDown: vel, draft: null, changed: true };
    d.draft = laneVelocityDraft(d, vel);
    laneDragRef.current = d;
    setDraftNotes(d.draft);
  };

  const onLanePointerMove = (e: React.PointerEvent) => {
    const d = laneDragRef.current;
    if (!d || d.pointerId !== e.pointerId || !clip) return;
    const { vy } = lanePos(e);
    const vel = velFromY(vy);
    d.draft = laneVelocityDraft(d, vel);
    d.changed = true;
    setDraftNotes(d.draft);
  };

  // ── CC lane pointer handlers (sustain ranges / mod points). Same
  // draft-commit discipline as the velocity lane above: no pushHistory on
  // pointerdown for a drag (only for the one-shot double-click add), the
  // gesture-start snapshot of ranges/points lives on the drag ref, every
  // intermediate frame recomputes purely from that snapshot into
  // ccDragRef.current.draft + the mirrored draftCc state, single
  // pushHistory + editClip at pointerup (in the shared onPointerUp above).
  // lane === 'sustain': click selects a range; drag its edges (±5px)
  // retimes pedal-down/up; drag the body moves the whole range; double-
  // click empty adds a one-beat range; Delete (panel keydown) removes the
  // selected range.
  // lane === 'mod': drag a point to move it (time+value); double-click
  // adds a point; Delete removes the selected point. Point indices are
  // ALWAYS re-derived from `ccPoints` (never cached raw `cc` indices)
  // because a move re-sorts the array by time.
  const onLaneDownCc = (e: React.PointerEvent) => {
    if (!clip) return;
    const { cx, vy } = lanePos(e);
    const t = Math.max(0, xToTime(metrics, cx));
    if (lane === 'sustain') {
      const ranges = sustainRanges(clip.cc ?? [], clip.duration_seconds);
      const hitIdx = ranges.findIndex((r) => t >= r.down - 0.05 && t <= r.up + 0.05);
      if (hitIdx >= 0) {
        setSelectedRange(hitIdx);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        // No pushHistory() here — draft-commit, mirrors move/resize/lane.
        const r = ranges[hitIdx];
        const edgePx = 5 / metrics.pxPerSecond;
        const base = Math.abs(t - r.down) <= edgePx
          ? { kind: 'sus-edge' as const, range: hitIdx, edge: 'down' as const, ranges }
          : Math.abs(t - r.up) <= edgePx
            ? { kind: 'sus-edge' as const, range: hitIdx, edge: 'up' as const, ranges }
            : { kind: 'sus-move' as const, range: hitIdx, startCx: cx, ranges };
        ccDragRef.current = { ...base, pointerId: e.pointerId, draft: clip.cc ?? [], changed: false };
      } else if (e.detail === 2) {
        props.pushHistory();
        const beat = 60 / session.tempo_bpm;
        const next = [...sustainRanges(clip.cc ?? [], clip.duration_seconds), { down: t, up: t + beat }];
        editClip((c) => ({ ...c, cc: setSustainRanges(c.cc ?? [], next) }));
        setSelectedRange(next.length - 1);
      } else setSelectedRange(null);
    } else if (lane === 'mod') {
      const pts = ccPoints(clip.cc ?? [], 1);
      const hitIdx = pts.findIndex((p) => Math.abs(timeToX(metrics, p.time) - cx) <= 5);
      if (hitIdx >= 0) {
        setSelectedModPoint(hitIdx);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        // No pushHistory() here — draft-commit, mirrors move/resize/lane.
        ccDragRef.current = { kind: 'mod', pointerId: e.pointerId, index: hitIdx, draft: clip.cc ?? [], changed: false };
      } else if (e.detail === 2) {
        props.pushHistory();
        const value = Math.max(0, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));
        editClip((c) => ({
          ...c,
          cc: [...(c.cc ?? []), { controller: 1, value, time_seconds: t }]
            .sort((a, b) => a.time_seconds - b.time_seconds),
        }));
      } else setSelectedModPoint(null);
    }
  };

  const onLaneMoveCc = (e: React.PointerEvent) => {
    const d = ccDragRef.current;
    if (!d || d.pointerId !== e.pointerId || !clip) return;
    const { cx, vy } = lanePos(e);
    const t = Math.max(0, xToTime(metrics, cx));
    if (d.kind === 'sus-edge' || d.kind === 'sus-move') {
      const next = d.ranges.map((r, i) => {
        if (i !== d.range) return r;
        if (d.kind === 'sus-edge') {
          // Clamp at 0: setSustainRanges no longer clamps negatives itself.
          return d.edge === 'down'
            ? { ...r, down: Math.max(0, Math.min(t, r.up - 0.01)) }
            : { ...r, up: Math.max(0, Math.max(t, r.down + 0.01)) };
        }
        const delta = (cx - d.startCx) / metrics.pxPerSecond;
        return { down: Math.max(0, r.down + delta), up: Math.max(0, r.up + delta) };
      });
      const cc = setSustainRanges(clip.cc ?? [], next);
      d.draft = cc;
      d.changed = true;
      setDraftCc(cc);
    } else {
      const value = Math.max(0, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));
      // Re-derive from ccPoints (time-sorted) each move — never cache a raw
      // `cc` index across moves, since a prior move's sort can shift it.
      const pts = ccPoints(clip.cc ?? [], 1);
      const target = pts[d.index];
      if (!target) return;
      const cc = (clip.cc ?? [])
        .map((ev, i) => i === target.index ? { ...ev, value, time_seconds: t } : ev)
        .sort((a, b) => a.time_seconds - b.time_seconds);
      d.draft = cc;
      d.changed = true;
      setDraftCc(cc);
    }
  };

  // ── Drawing ─────────────────────────────────────────────────────────
  const scheduleDraw = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; draw(); drawLane(); });
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
    // Render the in-flight drag preview when present so drags feel live
    // without touching the committed clip (and the engine) per pixel.
    const notes = draftNotes ?? clip.notes;
    const selSet = new Set(selection);
    // Ghost tails: pedal-lengthened durations so sight matches sound. Uses
    // draftCc ?? clip.cc so an in-flight sustain-lane drag previews the
    // tail change live, same discipline as draftNotes above.
    const effective = applySustain(notes, draftCc ?? clip.cc ?? []);
    notes.forEach((n, i) => {
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
      const ext = effective[i].duration_seconds - n.duration_seconds;
      if (ext > 0) {
        g.fillStyle = cPrimary; g.globalAlpha = 0.25;
        g.fillRect(x + w, y + 1, timeToX(metrics, ext), ROW_H - 2);
        g.globalAlpha = 1;
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

  /** CC/velocity lane strip below the grid — shares scrollLeft with the
   * main canvas so bars line up with their notes' start columns. */
  const drawLane = () => {
    const canvas = laneCanvasRef.current, holder = scrollRef.current;
    if (!canvas || !holder || !clip) return;
    const dpr = window.devicePixelRatio || 1;
    const vw = canvas.clientWidth, vh = LANE_H;
    if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) { canvas.width = vw * dpr; canvas.height = vh * dpr; }
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = holder.scrollLeft;
    const cBg = tokenColor(holder, '--card', '#111');
    const cBorder = tokenColor(holder, '--border', '#333');
    const cPrimary = tokenColor(holder, '--primary', '#7c3aed');
    const cFg = tokenColor(holder, '--foreground', '#eee');
    g.fillStyle = cBg; g.fillRect(0, 0, vw, vh);
    g.save(); g.translate(-sx, 0);
    if (lane === 'velocity') {
      // Render the in-flight lane-drag (or grid-drag velocity change)
      // preview, same as draw()'s note grid — keeps the two canvases in
      // sync without touching the committed clip per pixel.
      const notes = draftNotes ?? clip.notes;
      const selSet = new Set(selection);
      notes.forEach((n, i) => {
        const x = timeToX(metrics, n.start_seconds);
        const h = (n.velocity / 127) * (vh - 4);
        g.fillStyle = cPrimary;
        g.globalAlpha = selSet.has(i) ? 1 : 0.55;
        g.fillRect(x, vh - h, 4, h);
        g.globalAlpha = 1;
        if (selSet.has(i)) { g.strokeStyle = cFg; g.strokeRect(x + 0.5, vh - h + 0.5, 3, h - 1); }
      });
    }
    // Draft-commit preview for CC lane edits — render the in-flight drag
    // over the committed clip.cc, same discipline as draftNotes above.
    const cc = draftCc ?? clip.cc ?? [];
    if (lane === 'sustain') {
      const ranges = sustainRanges(cc, clip.duration_seconds);
      ranges.forEach((r, i) => {
        const x0 = timeToX(metrics, r.down), x1 = timeToX(metrics, r.up);
        g.fillStyle = cPrimary;
        g.globalAlpha = selectedRange === i ? 0.8 : 0.45;
        g.fillRect(x0, 8, Math.max(2, x1 - x0), vh - 16);
        g.globalAlpha = 1;
        if (selectedRange === i) { g.strokeStyle = cFg; g.strokeRect(x0 + 0.5, 8.5, Math.max(2, x1 - x0) - 1, vh - 17); }
      });
    }
    if (lane === 'mod') {
      const pts = ccPoints(cc, 1);
      g.strokeStyle = cPrimary; g.beginPath();
      pts.forEach((p, i) => {
        const x = timeToX(metrics, p.time), y = vh - (p.value / 127) * (vh - 4) - 2;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.stroke();
      pts.forEach((p, i) => {
        const x = timeToX(metrics, p.time), y = vh - (p.value / 127) * (vh - 4) - 2;
        g.fillStyle = selectedModPoint === i ? cFg : cPrimary;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      });
    }
    g.restore();
    g.strokeStyle = cBorder; g.strokeRect(0.5, 0.5, vw - 1, vh - 1);
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
    setSelectedRange(null);
    setSelectedModPoint(null);
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
          {/* Toolbar: grid/strength (quantize input) + quantize/transpose ops. */}
          <div className="px-3 py-1 border-b border-border flex items-center gap-2 text-xs flex-wrap" data-roll-toolbar>
            <div className="flex border border-border">
              {(['pointer', 'pencil'] as const).map((t) => (
                <button key={t} onClick={() => setTool(t)}
                  className={`px-2 py-0.5 ${tool === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                  {t === 'pointer' ? 'Pointer' : 'Pencil'}
                </button>
              ))}
            </div>
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
            <button onClick={applyQuantize} disabled={!selection.length}
              className="px-2 py-0.5 border border-border bg-muted hover:bg-muted/70 disabled:opacity-40 font-semibold">
              Quantize
            </button>
            <span className="text-muted-foreground">·</span>
            {[
              { label: '♯ +1', st: 1 }, { label: '♭ −1', st: -1 },
              { label: '8va', st: 12 }, { label: '8vb', st: -12 },
            ].map((b) => (
              <button key={b.label} onClick={() => applyTranspose(b.st)} disabled={!selection.length}
                className="px-2 py-0.5 border border-border bg-muted hover:bg-muted/70 disabled:opacity-40">
                {b.label}
              </button>
            ))}
            <span className="ml-auto text-muted-foreground">
              {selection.length ? `${selection.length} selected` : `${clip.notes.length} notes`}
            </span>
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
            onPointerCancel={onPointerCancel}
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
          <div className="flex border-t border-border">
            <select value={lane} onChange={(e) => setLane(e.target.value as RollLane)}
              className="w-12 shrink-0 border-r border-border bg-background text-xs px-0.5"
              style={{ width: KEYS_W }} title="Lane">
              <option value="velocity">Vel</option>
              <option value="sustain">Sus</option>
              <option value="mod">Mod</option>
            </select>
            <canvas
              ref={laneCanvasRef}
              className="block flex-1"
              style={{ height: LANE_H }}
              onPointerDown={lane === 'velocity' ? onLanePointerDown : onLaneDownCc}
              onPointerMove={lane === 'velocity' ? onLanePointerMove : onLaneMoveCc}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            />
          </div>
        </>
      )}
    </div>
  );
}
