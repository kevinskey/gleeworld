import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Plus, Minus, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startMetronome, stopMetronome, setMetronomeBpm, type Subdivision, type ClickSound } from '@/lib/audioTools/metronome';
import * as Tone from 'tone';
import { forceAudioUnlock } from '@/lib/audioTools/unlock';
import { PracticeRecorder } from './PracticeRecorder';

interface MetronomeProps {
  className?: string;
  /**
   * Starting tempo. Lets a caller hand the metronome a tempo instead of
   * making the user dial it in — e.g. a practice task that specifies one.
   * Only the INITIAL value; the user owns it after that, so changing this
   * prop later deliberately does nothing.
   */
  initialBpm?: number;
}

// Time-signature label → beats per bar. The denominator only affects
// notation; the metronome itself just clicks at the chosen BPM.
// Compound meters are listed with their CONDUCTED beat count, not the
// raw numerator: 6/8 is in 2 (two dotted quarters), 9/8 in 3, 12/8 in 4.
// Pair these with subdivision = 3 to hear the underlying eighth pulses.
const TIME_SIGS: Record<string, number> = {
  '2/2': 2,
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '5/4': 5,
  '6/4': 6,
  '7/4': 7,
  '3/8': 1,
  '6/8': 2,
  '9/8': 3,
  '12/8': 4,
};

// "Beat note" — which rhythmic value one BPM tick represents. This is
// display-only (the metronome still clicks at `60/bpm` seconds), but
// conductors care which note name shows on the tempo marking because
// half-note = 60 reads very differently from quarter = 60.
//
// `glyph` is rendered through Bravura (loaded in index.html) so the
// half-note codepoints (U+1D15D etc., outside the BMP) actually render
// instead of showing up as ?? boxes in system fonts. `option` is the
// plain-text label used inside <select> options, which most browsers
// won't render with a custom font reliably.
const BEAT_NOTES: Array<{ key: string; glyph: string; label: string }> = [
  { key: 'half-dot',     glyph: '\uD834\uDD5D.', label: 'Dotted half' },
  { key: 'half',         glyph: '\uD834\uDD5D',  label: 'Half' },
  { key: 'quarter-dot',  glyph: '♩.',            label: 'Dotted quarter' },
  { key: 'quarter',      glyph: '♩',             label: 'Quarter' },
  { key: 'eighth',       glyph: '♪',             label: 'Eighth' },
];

// Drift-free metronome with BPM slider, tap tempo, time signature.
// Reuses the shared Tone.Transport scheduler so multiple instances
// would conflict — this component is meant to mount once at a time.
export function Metronome({ className, initialBpm }: MetronomeProps) {
  const [bpm, setBpm] = useState(
    initialBpm && initialBpm >= 30 && initialBpm <= 240 ? Math.round(initialBpm) : 96,
  );
  // Time signature is stored as a "label" key into TIME_SIGS so the
  // dropdown can offer compound meters (6/8) alongside the simple-quarter
  // family without us having to track numerator/denominator separately.
  const [timeSigKey, setTimeSigKey] = useState<string>('4/4');
  const beatsPerBar = TIME_SIGS[timeSigKey] ?? 4;
  const [running, setRunning] = useState(false);
  const [accent, setAccent] = useState(true);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [sound, setSound] = useState<ClickSound>('beep');
  const [beatNote, setBeatNote] = useState<string>('quarter');
  const beatGlyph = BEAT_NOTES.find((n) => n.key === beatNote)?.glyph ?? '♩';
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const tapTimesRef = useRef<number[]>([]);

  // Restart the scheduler when settings change while running.
  useEffect(() => {
    if (!running) return;
    startMetronome({
      bpm, beatsPerBar, accentFirstBeat: accent, subdivision, sound,
      onTick: (b) => setCurrentBeat(b),
    });
    return () => { stopMetronome(); setCurrentBeat(-1); };
  }, [running, bpm, beatsPerBar, accent, subdivision, sound]);

  // Live BPM updates without restarting the schedule.
  useEffect(() => { if (running) setMetronomeBpm(bpm); }, [bpm, running]);

  // Click toggles play/stop. Tone.start() MUST be invoked synchronously
  // inside the user gesture or the audio context stays suspended and no
  // click ever plays.
  const toggle = () => {
    forceAudioUnlock();
    try { Tone.start(); } catch {}
    setRunning((v) => !v);
  };

  const tap = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    while (taps.length > 5 && taps[0] < now - 3000) taps.shift();
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avgMs = intervals.reduce((s, n) => s + n, 0) / intervals.length;
      const detected = Math.round(60000 / avgMs);
      if (detected >= 30 && detected <= 240) setBpm(detected);
    }
  };

  return (
    <div className={cn('p-3 space-y-3 bg-card border rounded-lg', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Metronome</div>
        <div className="text-2xl font-bold tabular-nums flex items-baseline gap-1">
          {/* Bravura is the SMuFL font we already preload — it covers the
              Unicode musical-symbols block so half-note + dotted-half
              actually render here instead of falling back to ?? boxes. */}
          <span
            className="text-foreground/80"
            style={{ fontFamily: 'Bravura, "Noto Music", serif' }}
            aria-label="Beat note"
          >
            {beatGlyph}
          </span>
          <span className="text-muted-foreground text-base">=</span>
          <span>{bpm}</span>
        </div>
      </div>

      {/* Beat lamps */}
      <div className="flex gap-1.5 items-center justify-center">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-3 rounded-full transition-colors',
              currentBeat === i ? (i === 0 && accent ? 'bg-primary' : 'bg-foreground') : 'bg-muted',
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setBpm((v) => Math.max(30, v - 1))} className="h-8 w-8 p-0">
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Slider value={[bpm]} min={30} max={240} step={1} onValueChange={(v) => setBpm(v[0])} className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setBpm((v) => Math.min(240, v + 1))} className="h-8 w-8 p-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Time:</span>
          <select
            value={timeSigKey}
            onChange={(e) => setTimeSigKey(e.target.value)}
            className="border rounded px-1 py-0.5 bg-background"
          >
            {Object.keys(TIME_SIGS).map((sig) => (
              <option key={sig} value={sig}>{sig}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Beat:</span>
          <select
            value={beatNote}
            onChange={(e) => setBeatNote(e.target.value)}
            className="border rounded px-1 py-0.5 bg-background"
            aria-label="Note value that gets the beat"
          >
            {BEAT_NOTES.map((n) => (
              <option key={n.key} value={n.key}>{n.label}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} />
          <span>Accent 1</span>
        </label>
        <Button size="sm" variant="outline" onClick={tap} className="h-7 px-2 text-xs">
          Tap
        </Button>
      </div>

      {/* Subdivisions — quieter higher-pitched pulses inside each beat.
          1 = beat only, 2 = eighths, 3 = triplets, 4 = sixteenths,
          8 = thirty-seconds. */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground shrink-0">Subdivide:</span>
        {([
          { v: 1 as Subdivision, label: '−', title: 'No subdivision' },
          { v: 2 as Subdivision, label: '♫',  title: 'Eighths' },
          { v: 3 as Subdivision, label: '³',  title: 'Triplets' },
          { v: 4 as Subdivision, label: '♬',  title: 'Sixteenths' },
          { v: 8 as Subdivision, label: '32', title: '32nd notes' },
        ]).map(({ v, label, title }) => (
          <button
            key={v}
            type="button"
            onClick={() => setSubdivision(v)}
            title={title}
            className={cn(
              'h-7 min-w-[28px] px-2 rounded border text-xs transition-colors',
              subdivision === v
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border hover:bg-muted text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sound picker — beep (default pitched square wave), click
          (mechanical non-pitched high-pass), wood (bandpass wood-knock),
          cowbell (808 cowbell voice). */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground shrink-0">Sound:</span>
        {([
          { v: 'beep' as ClickSound,      label: 'Beep',  title: 'Pitched square-wave tone' },
          { v: 'click' as ClickSound,     label: 'Click', title: 'Mechanical metronome click (non-pitched)' },
          { v: 'woodblock' as ClickSound, label: 'Wood',  title: 'Wood-block knock' },
          { v: 'cowbell' as ClickSound,   label: 'Bell',  title: 'Cowbell' },
        ]).map(({ v, label, title }) => (
          <button
            key={v}
            type="button"
            onClick={() => setSound(v)}
            title={title}
            className={cn(
              'h-7 px-2.5 rounded border text-xs transition-colors',
              sound === v
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border hover:bg-muted text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant={running ? 'default' : 'outline'}
        onClick={toggle}
        className="w-full"
      >
        {running ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
        {running ? 'Stop' : 'Start'}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => setRecorderOpen(true)}
        className="w-full"
      >
        <Mic className="w-4 h-4 mr-1" /> Record practice
      </Button>

      <PracticeRecorder
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        bpm={bpm}
        timeSig={timeSigKey}
      />
    </div>
  );
}
