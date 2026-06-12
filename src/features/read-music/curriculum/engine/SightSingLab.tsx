import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { autoCorrelate } from '@/components/tuner/Tuner';
import { POOLS } from '../../lib/notes';
import { noteKeyToFreq } from '../../lib/notes';
import { playNote, playChime } from '../../lib/audio';
import Notation from './Notation';

// comfortable singing range: G3–E5 across treble pool + an octave down option
const TARGETS = POOLS.treble.map((e) => e.key);

const HOLD_FRAMES = 12; // ~0.4s of consecutive in-tune frames
const CENTS_TOL = 60;

function centsOff(freq: number, target: number): number {
  return 1200 * Math.log2(freq / target);
}

/** Accept the sung pitch in any octave (singers transpose to their range). */
function bestCents(freq: number, targetFreq: number): number {
  let best = Infinity;
  for (let oct = -2; oct <= 2; oct++) {
    const c = centsOff(freq, targetFreq * Math.pow(2, oct));
    if (Math.abs(c) < Math.abs(best)) best = c;
  }
  return best;
}

export default function SightSingLab() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetKey, setTargetKey] = useState(() => TARGETS[Math.floor(Math.random() * TARGETS.length)]);
  const [cents, setCents] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hit, setHit] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const holdRef = useRef(0);
  const hitRef = useRef(false);
  const targetFreqRef = useRef(noteKeyToFreq(targetKey));

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);
    setCents(null);
  };

  useEffect(() => stop, []);

  const nextNote = () => {
    const next = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    setTargetKey(next);
    targetFreqRef.current = noteKeyToFreq(next);
    holdRef.current = 0;
    hitRef.current = false;
    setHit(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      streamRef.current = stream;
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new Ctor();
      }
      if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
      const source = ctxRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = ctxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, ctxRef.current!.sampleRate);
        if (freq && freq > 60 && freq < 1500) {
          const c = bestCents(freq, targetFreqRef.current);
          setCents(c);
          if (Math.abs(c) <= CENTS_TOL && !hitRef.current) {
            holdRef.current += 1;
            if (holdRef.current >= HOLD_FRAMES) {
              hitRef.current = true;
              setHit(true);
              setScore((s) => s + 1);
              playChime('right');
              window.setTimeout(nextNote, 1200);
            }
          } else if (Math.abs(c) > CENTS_TOL) {
            holdRef.current = 0;
          }
        } else {
          setCents(null);
          holdRef.current = 0;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError('Microphone unavailable. Check permissions and try again.');
      stop();
    }
  };

  const inTune = cents !== null && Math.abs(cents) <= CENTS_TOL;
  const needle = cents === null ? 0 : Math.max(-50, Math.min(50, cents / 2));

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider rounded bg-amber-100 text-amber-800 px-2 py-0.5">Experimental</span>
        <span className="text-sm text-muted-foreground">Notes matched: <span className="font-bold text-foreground">{score}</span></span>
      </div>

      <p className="font-medium">Sing this note and hold it. Any octave counts.</p>

      <div className="flex items-center gap-4">
        <Notation spec={{ clef: 'treble', keys: [targetKey] }} />
        <Button variant="outline" size="sm" onClick={() => playNote(targetKey, 900)}>
          <Volume2 className="mr-2 h-4 w-4" /> Hear it
        </Button>
      </div>

      {listening && (
        <div className="space-y-2">
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
            <div
              className={`absolute inset-y-0 w-2 rounded-full transition-all duration-75 ${inTune ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ left: `calc(50% + ${needle}% - 4px)` }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {hit ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Got it!
              </span>
            ) : cents === null ? 'Listening… sing into the mic' : inTune ? 'Hold it…' : Math.round(cents) > 0 ? 'A little high' : 'A little low'}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        {listening ? (
          <Button variant="outline" onClick={stop}><MicOff className="mr-2 h-4 w-4" /> Stop</Button>
        ) : (
          <Button onClick={start}><Mic className="mr-2 h-4 w-4" /> Start singing</Button>
        )}
        <Button variant="ghost" onClick={nextNote}>Skip note</Button>
      </div>
    </div>
  );
}
