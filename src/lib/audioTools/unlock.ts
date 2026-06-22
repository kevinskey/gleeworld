// Global audio unlock for iOS WKWebView and mobile Safari.
//
// iOS will not let the Web Audio context produce sound until it has been
// resumed inside a user gesture. By the time someone taps a piano key or
// hits the metronome's Start, the context might still be suspended — and
// an `await Tone.start()` doesn't always cross the gesture frame in time.
//
// Solution: bind a one-shot listener to the FIRST pointer/touch/key event
// on the document. Inside that listener (which IS a user gesture), call
// Tone.start() and play a silent buffer. After that the context stays
// running and every subsequent triggerAttack works without further
// ceremony.

import * as Tone from 'tone';
import { preloadPianoSampler } from './pianoSampler';

let unlocked = false;
let unlockInflight = false;

function unlockSync() {
  // SYNCHRONOUS portion — runs inside the user-gesture frame. Resume the
  // raw AudioContext + play a silent buffer through it. This is what
  // actually flips iOS's "audio was emitted in a user gesture" bit.
  try {
    const ctx = Tone.getContext().rawContext as AudioContext;
    // On Safari/WebKit, calling resume() returns a promise but the state
    // transition begins immediately. The silent buffer below carries the
    // gesture even before resume() settles.
    ctx.resume?.();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* will retry on next gesture */
  }
}

async function unlockAsync() {
  if (unlockInflight) return;
  unlockInflight = true;
  try {
    await Tone.start();
    // Kick off Salamander sample download so the first piano / pitch-pipe
    // tap gets real piano voice rather than the polysynth fallback.
    preloadPianoSampler().catch(() => {});
  } catch { /* ignore */ } finally {
    unlockInflight = false;
  }
}

export function installAudioUnlock() {
  if (typeof window === 'undefined') return;
  const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handler = () => {
    unlockSync();         // synchronous — keeps us inside the gesture
    void unlockAsync();   // resolves Tone.start() asynchronously
    if (unlocked) {
      events.forEach((ev) => document.removeEventListener(ev, handler, true));
    }
  };
  events.forEach((ev) => document.addEventListener(ev, handler, true));
}

/** Force-unlock from inside a known user gesture (e.g. the Metronome's
 *  Start button). Safe to call repeatedly — no-op once unlocked. */
export function forceAudioUnlock() {
  if (!unlocked) unlockSync();
  void unlockAsync();
}
