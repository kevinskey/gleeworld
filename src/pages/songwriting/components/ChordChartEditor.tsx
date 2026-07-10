// Ported from the standalone songwriter app's client/src/components/ChordChartEditor.tsx.
// CRUD logic (add/delete/split/merge bar, loop region, click toggle, Tone.js
// play/stop) is kept byte-identical to the source — only imports and
// Tailwind classes changed for this app's light theme + shadcn design
// tokens. Tone.js playback is only ever started from play(), which is only
// ever invoked by the Play button's onClick — a user gesture, as required
// by browsers' autoplay policy and preserved unchanged from the source.

import { useEffect, useRef, useState } from 'react';
import type { ChordChart, ChordBar, ChordLoop, TimeSignature } from '@/lib/songwriting/types';
import { parseChord } from '@/lib/songwriting/chords';
import { ChordEngine } from '@/lib/songwriting/chordEngine';

const SIGS: TimeSignature[] = ['4/4', '3/4', '6/8', '2/4'];

function uid(): string {
  return crypto.randomUUID();
}

export default function ChordChartEditor({
  chart,
  bpm,
  onChange,
  onTempoChange,
  headerExtras,
}: {
  chart: ChordChart;
  bpm: number | null;
  onChange: (next: ChordChart) => void;
  onTempoChange: (next: number) => void;
  // Optional buttons (Copy, Detach, etc.) rendered in the header next to Play.
  headerExtras?: React.ReactNode;
}) {
  const value: ChordChart = chart;

  const [playing, setPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [click, setClick] = useState(() => {
    const stored = localStorage.getItem('chordChart:click');
    return stored == null ? true : stored === '1';
  });
  const engineRef = useRef<ChordEngine | null>(null);

  useEffect(() => {
    localStorage.setItem('chordChart:click', click ? '1' : '0');
    engineRef.current?.setClick(click);
  }, [click]);

  const loop = value.loop ?? null;
  const loopActive = !!loop;
  const setLoop = (next: ChordLoop | null) => {
    onChange({ ...value, loop: next });
  };

  const effectiveBpm = bpm && bpm > 0 ? bpm : 100;

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  function setBars(bars: ChordBar[]) {
    onChange({ ...value, bars });
  }

  function addBar() {
    setBars([...value.bars, { id: uid(), chords: [''] }]);
  }

  function deleteBar(id: string) {
    setBars(value.bars.filter((b) => b.id !== id));
  }

  function updateBarChord(id: string, chordIdx: number, symbol: string) {
    setBars(
      value.bars.map((b) =>
        b.id === id
          ? {
              ...b,
              chords: b.chords.map((c, i) => (i === chordIdx ? symbol : c)),
            }
          : b
      )
    );
  }

  function splitBar(id: string) {
    setBars(
      value.bars.map((b) =>
        b.id === id && b.chords.length < 4
          ? { ...b, chords: [...b.chords, ''] }
          : b
      )
    );
  }

  function mergeBar(id: string) {
    setBars(
      value.bars.map((b) =>
        b.id === id && b.chords.length > 1
          ? { ...b, chords: b.chords.slice(0, -1) }
          : b
      )
    );
  }

  async function play() {
    if (!engineRef.current) engineRef.current = new ChordEngine();
    setPlaying(true);
    setActiveBar(loop ? loop.startBar : 0);
    await engineRef.current.start(
      value,
      effectiveBpm,
      {
        onBar: (idx) => setActiveBar(idx),
        onStop: () => {
          setPlaying(false);
          setActiveBar(null);
        },
      },
      { loop, click }
    );
  }

  function stop() {
    engineRef.current?.stop();
    setPlaying(false);
    setActiveBar(null);
  }

  const totalBeats =
    value.bars.length *
    (value.time_signature === '4/4' ? 4
      : value.time_signature === '3/4' ? 3
      : value.time_signature === '6/8' ? 6
      : 2);
  const durationSec = totalBeats * (60 / effectiveBpm);

  return (
    <div className="border border-border rounded-md bg-card mb-8">
      <div className={`flex items-center gap-3 px-4 py-3 flex-wrap ${collapsed ? '' : 'border-b border-border'}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          title={collapsed ? 'Expand chart' : 'Collapse chart'}
        >
          {collapsed ? '▸' : '▾'} Chord chart
        </button>
        <select
              value={value.time_signature}
              onChange={(e) => onChange({ ...value, time_signature: e.target.value as TimeSignature })}
              className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground"
            >
              {SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="number"
                value={bpm ?? ''}
                placeholder="100"
                onChange={(e) => onTempoChange(Number(e.target.value) || 0)}
                className="w-16 border border-border rounded px-2 py-1 bg-card text-foreground"
              />
              <span>BPM</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {value.bars.length} {value.bars.length === 1 ? 'bar' : 'bars'}
              {value.bars.length > 0 && ` · ${formatDuration(durationSec)}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setClick((c) => !c)}
                title={click ? 'Metronome on — tap to mute' : 'Metronome muted — tap to play'}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                  click
                    ? 'border-primary text-primary-foreground bg-primary hover:bg-primary/90'
                    : 'border-border text-muted-foreground bg-card line-through hover:border-primary'
                }`}
              >
                ♩ Click {click ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (loopActive) setLoop(null);
                  else setLoop({ startBar: 0, endBar: Math.max(0, value.bars.length - 1), count: 2 });
                }}
                disabled={value.bars.length === 0}
                title={loopActive ? 'Repeat enabled — click to disable' : 'Add a repeat region'}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-40 ${
                  loopActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                ↻ Repeat
              </button>
              {!playing ? (
                <button
                  type="button"
                  onClick={play}
                  disabled={value.bars.length === 0}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  ▶ Play
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stop}
                  className="text-xs px-3 py-1.5 rounded-md bg-foreground text-background"
                >
                  ◼ Stop
                </button>
              )}
              {headerExtras}
            </div>
      </div>

      {!collapsed && (
        <div className="p-4">
          {loopActive && loop && (
            <LoopBar
              loop={loop}
              barCount={value.bars.length}
              onChange={setLoop}
            />
          )}
          {value.bars.length === 0 ? (
            <div className="text-sm text-muted-foreground italic mb-3">
              No bars yet. Add a bar to start sketching the chord progression.
            </div>
          ) : (
            <BarsGrid
              bars={value.bars}
              activeBar={activeBar}
              loop={loop}
              onChord={updateBarChord}
              onDelete={deleteBar}
              onSplit={splitBar}
              onMerge={mergeBar}
              onSetLoopStart={(idx) => setLoop({
                startBar: idx,
                endBar: Math.max(idx, loop?.endBar ?? idx),
                count: loop?.count ?? 2,
              })}
              onSetLoopEnd={(idx) => setLoop({
                startBar: Math.min(idx, loop?.startBar ?? idx),
                endBar: idx,
                count: loop?.count ?? 2,
              })}
            />
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={addBar}
              className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              + Add bar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoopBar({
  loop, barCount, onChange,
}: {
  loop: ChordLoop;
  barCount: number;
  onChange: (next: ChordLoop) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 px-3 py-2 rounded-md bg-primary/5 border border-primary/30 text-xs">
      <span className="text-muted-foreground">Repeat bars</span>
      <BarPicker
        value={loop.startBar}
        max={barCount - 1}
        onChange={(v) => onChange({ ...loop, startBar: Math.min(v, loop.endBar) })}
      />
      <span className="text-muted-foreground">→</span>
      <BarPicker
        value={loop.endBar}
        max={barCount - 1}
        onChange={(v) => onChange({ ...loop, endBar: Math.max(v, loop.startBar) })}
      />
      <span className="text-muted-foreground ml-2">×</span>
      <input
        type="number"
        min={1}
        value={loop.count === 0 ? '' : loop.count}
        placeholder="∞"
        onChange={(e) => {
          const v = e.target.value.trim();
          const n = v === '' ? 0 : Math.max(1, Math.floor(Number(v) || 0));
          onChange({ ...loop, count: n });
        }}
        className="w-14 px-1.5 py-0.5 border border-border rounded bg-card text-foreground text-center"
      />
      <span className="text-muted-foreground">{loop.count === 0 ? 'forever' : `time${loop.count === 1 ? '' : 's'}`}</span>
    </div>
  );
}

function BarPicker({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      max={max + 1}
      value={value + 1}
      onChange={(e) => {
        const n = Math.max(1, Math.min(max + 1, Math.floor(Number(e.target.value) || 1)));
        onChange(n - 1);
      }}
      className="w-14 px-1.5 py-0.5 border border-border rounded bg-card text-foreground text-center"
    />
  );
}

function BarsGrid({
  bars, activeBar, loop, onChord, onDelete, onSplit, onMerge, onSetLoopStart, onSetLoopEnd,
}: {
  bars: ChordBar[];
  activeBar: number | null;
  loop: ChordLoop | null;
  onChord: (id: string, idx: number, symbol: string) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string) => void;
  onMerge: (id: string) => void;
  onSetLoopStart: (idx: number) => void;
  onSetLoopEnd: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2">
      {bars.map((bar, idx) => {
        const isActive = activeBar === idx;
        const valid = bar.chords.every((c) => !c.trim() || parseChord(c) !== null);
        const inLoop = loop && idx >= loop.startBar && idx <= loop.endBar;
        const isLoopStart = loop && idx === loop.startBar;
        const isLoopEnd = loop && idx === loop.endBar;
        return (
          <div
            key={bar.id}
            className={`relative border rounded-md p-2 transition-colors ${
              isActive ? 'border-primary bg-primary/10'
                : inLoop ? 'border-primary/40 bg-primary/[0.03]'
                : 'border-border bg-card'
            }`}
          >
            {/* Repeat-region barlines, drawn music-notation style on the side. */}
            {isLoopStart && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-md" title="Loop start (|:)" />
            )}
            {isLoopEnd && (
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-md" title="Loop end (:|)" />
            )}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Bar {idx + 1}</span>
              <div className="flex items-center gap-1">
                {loop && (
                  <>
                    <button
                      type="button"
                      title="Set as repeat start (|:)"
                      onClick={() => onSetLoopStart(idx)}
                      className={`text-xs px-1 ${isLoopStart ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'}`}
                    >|:</button>
                    <button
                      type="button"
                      title="Set as repeat end (:|)"
                      onClick={() => onSetLoopEnd(idx)}
                      className={`text-xs px-1 ${isLoopEnd ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'}`}
                    >:|</button>
                  </>
                )}
                <button
                  type="button"
                  title="Add chord to this bar"
                  onClick={() => onSplit(bar.id)}
                  disabled={bar.chords.length >= 4}
                  className="text-xs text-muted-foreground hover:text-primary disabled:opacity-30"
                >+</button>
                {bar.chords.length > 1 && (
                  <button
                    type="button"
                    title="Remove last chord in bar"
                    onClick={() => onMerge(bar.id)}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >−</button>
                )}
                <button
                  type="button"
                  title="Delete bar"
                  onClick={() => onDelete(bar.id)}
                  className="text-xs text-muted-foreground hover:text-rose-500"
                >×</button>
              </div>
            </div>
            <div className="flex gap-1">
              {bar.chords.map((c, i) => (
                <input
                  key={i}
                  value={c}
                  onChange={(e) => onChord(bar.id, i, e.target.value)}
                  placeholder={i === 0 ? 'C' : '·'}
                  className={`flex-1 min-w-0 text-sm font-serif text-center bg-transparent border-b ${
                    valid ? 'border-border' : 'border-rose-300'
                  } focus:border-primary focus:outline-none px-1 py-1 text-foreground`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
