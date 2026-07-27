import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Mic, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Voice } from '@/lib/sightReading/generate';
import { useMicPitch } from '@/lib/sightReading/useMicPitch';
import { supabase } from '@/integrations/supabase/client';

// Voice tessituras. MIDI note numbers (C4 = 60).
// Kept intentionally to the practical singing range, not the extreme edges.
const VOICE_RANGE: Record<Voice, [number, number]> = {
  soprano: [60, 81],  // C4–A5
  alto:    [55, 76],  // G3–E5
  tenor:   [48, 67],  // C3–G4
  bass:    [40, 60],  // E2–C4
};

const CENTS_TOLERANCE = 50;       // ± half a semitone counts as "on pitch"
const HOLD_MS_REQUIRED = 2000;    // 2 sec of held match
const LISTEN_MS = 4000;           // 4 sec to try each note
const PLAY_TONE_MS = 1200;
const CLARITY_MIN = 0.7;          // pitch detector confidence threshold

type Phase = 'idle' | 'playing' | 'listening' | 'result';
type Outcome = 'correct' | 'missed';

interface Attempt {
  targetMidi: number;
  sungMidi: number | null;
  centsOff: number | null;
  outcome: Outcome;
  heldMs: number;
}

const MIDI_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiName(m: number): string {
  return `${MIDI_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
}
function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Pick a target in the voice's range. Start with tonic-neighborhood (middle
// of range) and widen as the streak grows: at streak≥3 include the outer
// third of range, at streak≥8 the whole range.
function pickTarget(voice: Voice, streak: number, previousTarget: number | null): number {
  const [lo, hi] = VOICE_RANGE[voice];
  const mid = Math.round((lo + hi) / 2);
  const halfWidth = streak < 3 ? 3 : streak < 8 ? Math.round((hi - lo) / 3) : Math.round((hi - lo) / 2);
  const rangeLo = Math.max(lo, mid - halfWidth);
  const rangeHi = Math.min(hi, mid + halfWidth);
  let target: number;
  let tries = 0;
  do {
    target = rangeLo + Math.floor(Math.random() * (rangeHi - rangeLo + 1));
    tries++;
  } while (target === previousTarget && tries < 5);
  return target;
}

async function playTone(midi: number): Promise<void> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  if (ctx.state !== 'running') await ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.02);
  g.gain.setValueAtTime(0.25, t + (PLAY_TONE_MS - 200) / 1000);
  g.gain.linearRampToValueAtTime(0, t + PLAY_TONE_MS / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + PLAY_TONE_MS / 1000 + 0.05);
  await new Promise((r) => setTimeout(r, PLAY_TONE_MS));
  await ctx.close();
}

interface Props {
  voice: Voice;
}

export function PitchMatchTab({ voice }: Props) {
  const mic = useMicPitch();
  const [phase, setPhase] = useState<Phase>('idle');
  const [target, setTarget] = useState<number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [lastCentsOff, setLastCentsOff] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [heldMs, setHeldMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const heldStartRef = useRef<number | null>(null);
  const listenTimeoutRef = useRef<number | null>(null);
  const holdCheckRef = useRef<number | null>(null);

  const stopEverything = useCallback(() => {
    if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
    if (holdCheckRef.current) { clearInterval(holdCheckRef.current); holdCheckRef.current = null; }
    mic.stop();
    heldStartRef.current = null;
    setHeldMs(0);
  }, [mic]);

  useEffect(() => stopEverything, [stopEverything]);

  const persistAttempt = useCallback(async (a: Attempt) => {
    const { error } = await supabase.from('gw_pitch_match_attempts').insert({
      voice,
      target_midi: a.targetMidi,
      sung_midi: a.sungMidi,
      cents_off: a.centsOff,
      matched: a.outcome === 'correct',
      held_ms: a.heldMs,
    });
    if (error) {
      // Silent-write mitigation: notify but keep session going.
      toast.error('Attempt not saved', { description: error.message });
    }
  }, [voice]);

  const finish = useCallback((outcome: Outcome, heldMsFinal: number) => {
    if (target == null) return;
    const l = mic.live;
    const sungMidi = l ? l.midi : null;
    const centsOff = l ? Math.round(l.midi + l.cents / 100 - target) * 100 + (l ? Math.round(l.cents) : 0) : null;
    // Simpler: prefer the raw signed distance from target in cents when live at moment of finish.
    const rawCentsOff = l ? Math.round((l.midi - target) * 100 + l.cents) : null;
    const attempt: Attempt = {
      targetMidi: target,
      sungMidi,
      centsOff: rawCentsOff,
      outcome,
      heldMs: heldMsFinal,
    };
    setAttempts((prev) => [attempt, ...prev].slice(0, 20));
    setLastOutcome(outcome);
    setLastCentsOff(rawCentsOff);
    setStreak((s) => (outcome === 'correct' ? s + 1 : 0));
    setPhase('result');
    stopEverything();
    void persistAttempt(attempt);
    // Suppress unused-var lint on centsOff which is derived above but unused.
    void centsOff;
  }, [target, mic.live, stopEverything, persistAttempt]);

  const startRound = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setLastOutcome(null);
    setLastCentsOff(null);
    setHeldMs(0);
    const newTarget = pickTarget(voice, streak, target);
    setTarget(newTarget);
    setPhase('playing');
    try {
      await playTone(newTarget);
    } catch {
      // audio blocked — treat like a missed round
      toast.error('Audio blocked. Enable sound and try again.');
      setPhase('idle');
      setBusy(false);
      return;
    }
    setPhase('listening');
    const outcome = await mic.start(80);
    if (outcome !== 'granted') {
      toast.error(outcome === 'denied' ? 'Microphone permission denied' : 'Could not start microphone');
      setPhase('idle');
      setBusy(false);
      return;
    }
    // Poll live pitch and check hold.
    heldStartRef.current = null;
    const started = performance.now();
    holdCheckRef.current = window.setInterval(() => {
      const l = mic.live;
      if (!l || l.clarity < CLARITY_MIN) {
        heldStartRef.current = null;
        setHeldMs(0);
        return;
      }
      const centsDiff = Math.abs((l.midi - newTarget) * 100 + l.cents);
      if (centsDiff <= CENTS_TOLERANCE) {
        if (heldStartRef.current == null) heldStartRef.current = performance.now();
        const held = performance.now() - heldStartRef.current;
        setHeldMs(held);
        if (held >= HOLD_MS_REQUIRED) {
          finish('correct', Math.round(held));
        }
      } else {
        heldStartRef.current = null;
        setHeldMs(0);
      }
      void started;
    }, 80);
    listenTimeoutRef.current = window.setTimeout(() => {
      finish('missed', 0);
    }, LISTEN_MS);
    setBusy(false);
  }, [busy, voice, streak, target, mic, finish]);

  const totalAttempts = attempts.length;
  const correctCount = attempts.filter(a => a.outcome === 'correct').length;
  const accuracyPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  const heldPct = Math.min(100, Math.round((heldMs / HOLD_MS_REQUIRED) * 100));

  const liveMidi = mic.live?.midi ?? null;
  const liveCents = mic.live?.cents ?? 0;
  const centsDelta = liveMidi != null && target != null ? (liveMidi - target) * 100 + liveCents : null;
  const onPitch = centsDelta != null && Math.abs(centsDelta) <= CENTS_TOLERANCE;

  const [voiceLo, voiceHi] = VOICE_RANGE[voice];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pitch Match</p>
            <p className="text-sm text-slate-600">Voice: {voice} · Range {midiName(voiceLo)}–{midiName(voiceHi)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">Streak {streak}</Badge>
            <Badge variant="outline" className="text-xs">{correctCount}/{totalAttempts} · {accuracyPct}%</Badge>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border p-6 min-h-[10rem] flex flex-col items-center justify-center text-center">
          {phase === 'idle' && target == null && (
            <>
              <p className="text-sm text-slate-600 mb-3">
                We'll play a note. You have {LISTEN_MS/1000} seconds. Match it and hold for {HOLD_MS_REQUIRED/1000} seconds to score.
              </p>
              <Button size="lg" className="rounded-full" onClick={startRound} disabled={busy}>
                <Play className="w-4 h-4 mr-1" /> Start pitch match
              </Button>
            </>
          )}

          {phase === 'playing' && target != null && (
            <>
              <p className="text-xs text-slate-500 mb-1">Listen…</p>
              <p className="text-4xl font-bold text-slate-900">{midiName(target)}</p>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 mt-2" />
            </>
          )}

          {phase === 'listening' && target != null && (
            <>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Mic className="w-3 h-3" /> Sing</p>
              <p className="text-4xl font-bold text-slate-900">{midiName(target)}</p>
              <div className="mt-3 h-4 w-full max-w-xs bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-100 ${onPitch ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  style={{ width: `${heldPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {liveMidi != null && mic.live && mic.live.clarity >= CLARITY_MIN ? (
                  <>You're singing <span className="font-semibold">{midiName(liveMidi)}</span>{centsDelta != null && (<>{' '}({centsDelta > 0 ? '+' : ''}{Math.round(centsDelta)}¢)</>)}</>
                ) : (
                  'Waiting for a clear tone…'
                )}
              </p>
            </>
          )}

          {phase === 'result' && target != null && (
            <>
              {lastOutcome === 'correct' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                    <Check className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="text-lg font-semibold text-emerald-700">Correct!</p>
                  <p className="text-xs text-slate-600">You held {midiName(target)}{lastCentsOff != null && (<> at {lastCentsOff > 0 ? '+' : ''}{lastCentsOff}¢</>)}.</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-2">
                    <X className="w-7 h-7 text-rose-600" />
                  </div>
                  <p className="text-lg font-semibold text-rose-700">Missed</p>
                  <p className="text-xs text-slate-600">Target was {midiName(target)}. {lastCentsOff != null ? (<>You landed on {lastCentsOff > 0 ? '+' : ''}{lastCentsOff}¢.</>) : 'No clear tone detected.'}</p>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={startRound} disabled={busy} className="rounded-full">
                  <Play className="w-4 h-4 mr-1" /> Next
                </Button>
                <Button size="sm" variant="outline" onClick={() => { stopEverything(); setPhase('idle'); setTarget(null); }} className="rounded-full">
                  Stop
                </Button>
              </div>
            </>
          )}
        </div>

        {mic.permission === 'denied' && (
          <p className="text-xs text-rose-600">Microphone access is required. Grant it in your browser settings and reload.</p>
        )}
        {mic.error && phase !== 'idle' && (
          <p className="text-xs text-rose-600">Mic error: {mic.error}</p>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent attempts</p>
          <ul className="divide-y divide-slate-100">
            {attempts.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-900">Target {midiName(a.targetMidi)}</span>
                <span className="text-slate-600 text-xs">
                  {a.sungMidi != null ? midiName(a.sungMidi) : '—'}
                  {a.centsOff != null && (<>{' '}({a.centsOff > 0 ? '+' : ''}{a.centsOff}¢)</>)}
                </span>
                {a.outcome === 'correct' ? (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">Correct</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-200">Missed</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
