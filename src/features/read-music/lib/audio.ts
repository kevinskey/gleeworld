import { noteKeyToFreq } from "./notes";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playNote(noteKey: string, durationMs = 700): void {
  const c = getCtx();
  if (!c) return;
  const freq = noteKeyToFreq(noteKey);
  const now = c.currentTime;

  const osc1 = c.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = freq;
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;

  const gain = c.createGain();
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const mix = c.createGain();
  mix.gain.value = 0.7;
  const high = c.createGain();
  high.gain.value = 0.12;

  osc1.connect(mix).connect(gain).connect(c.destination);
  osc2.connect(high).connect(gain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + dur + 0.05);
  osc2.stop(now + dur + 0.05);
}

export function playChime(kind: "right" | "wrong" | "win"): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const seq =
    kind === "right" ? [660, 990] :
    kind === "wrong" ? [220, 165] :
    [523.25, 659.25, 783.99, 1046.5];

  seq.forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = kind === "wrong" ? "sawtooth" : "triangle";
    osc.frequency.value = f;
    const g = c.createGain();
    const t = now + i * 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}
