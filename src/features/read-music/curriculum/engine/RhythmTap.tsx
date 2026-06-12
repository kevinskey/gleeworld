import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { playClick } from '../../lib/audio';
import { RHYTHM_BEATS, type RhythmDur } from './types';

type Props = {
  durations: RhythmDur[];
  bpm: number;
  graded: boolean;
  onResult: (correct: boolean) => void;
};

type Phase = 'idle' | 'count' | 'tap';

export default function RhythmTap({ durations, bpm, graded, onResult }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [beatFlash, setBeatFlash] = useState(false);
  const tapsRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const beatMs = 60_000 / bpm;
  const totalBeats = durations.reduce((s, d) => s + RHYTHM_BEATS[d], 0);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const width = 300;
    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(width, 120);
    const ctx = renderer.getContext();
    const stave = new Stave(10, 10, width - 20);
    stave.addClef('treble').addTimeSignature('4/4').setContext(ctx).draw();
    const notes = durations.map((d) => new StaveNote({ keys: ['b/4'], duration: d, clef: 'treble' }));
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
    voice.addTickables(notes);
    new Formatter().joinVoices([voice]).format([voice], width - 110);
    voice.draw(ctx, stave);
  }, [durations]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const start = () => {
    tapsRef.current = [];
    setPhase('count');
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    for (let i = 0; i < 4; i++) {
      timersRef.current.push(window.setTimeout(() => {
        playClick(i === 0);
        setBeatFlash(true);
        window.setTimeout(() => setBeatFlash(false), 120);
      }, i * beatMs));
    }
    timersRef.current.push(window.setTimeout(() => {
      setPhase('tap');
      startRef.current = performance.now();
    }, 4 * beatMs));
    // end of pattern + grace period, then grade
    timersRef.current.push(window.setTimeout(() => grade(), 4 * beatMs + totalBeats * beatMs + beatMs * 0.6));
  };

  const grade = () => {
    setPhase('idle');
    const expected: number[] = [];
    let t = 0;
    for (const d of durations) {
      expected.push(t * beatMs);
      t += RHYTHM_BEATS[d];
    }
    const tol = Math.max(beatMs * 0.3, 160);
    const taps = [...tapsRef.current];
    let matched = 0;
    for (const e of expected) {
      const idx = taps.findIndex((tp) => Math.abs(tp - e) <= tol);
      if (idx >= 0) {
        matched++;
        taps.splice(idx, 1);
      }
    }
    const extras = taps.length;
    onResult(matched === expected.length && extras <= 1);
  };

  const tap = () => {
    if (phase !== 'tap') return;
    playClick(false);
    tapsRef.current.push(performance.now() - startRef.current);
  };

  return (
    <div className="space-y-3">
      <div ref={ref} className="inline-block rounded-md bg-white p-1" />
      {phase === 'idle' && !graded && (
        <div>
          <Button onClick={start}>
            <Play className="mr-2 h-4 w-4" /> Start (4 count-in clicks, then tap)
          </Button>
        </div>
      )}
      {phase !== 'idle' && (
        <button
          onPointerDown={tap}
          className={`w-full select-none rounded-xl border-2 py-10 text-lg font-semibold transition-colors ${
            phase === 'count'
              ? `border-primary/40 ${beatFlash ? 'bg-primary/20' : 'bg-primary/5'} text-primary`
              : 'border-brand bg-blue-50 text-blue-900 active:bg-blue-200'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          {phase === 'count' ? 'Get ready…' : 'TAP THE RHYTHM'}
        </button>
      )}
    </div>
  );
}
