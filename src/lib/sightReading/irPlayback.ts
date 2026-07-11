import type { ExerciseIR } from './ir';

export type ToneEvent = { hz: number; at: number; dur: number; gain: number };

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const CLICK_HZ = 880; // rhythm exercises: every note sounds as the same short tick

// Pure scheduling: beatPos/durationBeats are in units of the meter's beatType,
// and ir.tempo is beats-per-minute in that same unit (matches SingFlow/generate.ts).
export function irToToneEvents(ir: ExerciseIR, mode: 'pitch' | 'click'): ToneEvent[] {
  const secPerBeat = 60 / ir.tempo;
  return ir.notes.map((n) => ({
    hz: mode === 'click' ? CLICK_HZ : midiToHz(n.midi),
    at: n.beatPos * secPerBeat,
    dur: mode === 'click' ? Math.min(0.09, n.durationBeats * secPerBeat) : n.durationBeats * secPerBeat * 0.92,
    gain: mode === 'click' ? 0.25 : 0.18,
  }));
}

// Thin WebAudio wrapper, same triangle-tone idiom as SingFlow's playPriming().
// Own short-lived context so it never collides with useMicPitch's context.
export async function playIr(ir: ExerciseIR, mode: 'pitch' | 'click' = 'pitch'): Promise<void> {
  const AC = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  try {
    if (ctx.state !== 'running') {
      // Autoplay policies can reject resume() outside a user gesture; treat that
      // as a silent no-op rather than letting it reject the whole call — callers
      // rely on playIr() always resolving.
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }
    const t0 = ctx.currentTime + 0.05;
    const events = irToToneEvents(ir, mode);
    let end = 0;
    for (const e of events) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = e.hz;
      const at = t0 + e.at;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(e.gain, at + 0.015);
      g.gain.setValueAtTime(e.gain, Math.max(at + 0.015, at + e.dur - 0.05));
      g.gain.linearRampToValueAtTime(0, at + e.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + e.dur + 0.02);
      end = Math.max(end, e.at + e.dur);
    }
    await new Promise((r) => setTimeout(r, (end + 0.25) * 1000));
  } finally {
    ctx.close().catch(() => {});
  }
}
