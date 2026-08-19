// SoundCloud widget volume.
//
// Every SoundCloud player in the app is an <iframe> pointed at
// w.soundcloud.com, and the widget starts at 100% — it has no volume control
// in its own chrome at the heights we embed it, and nothing in the app can
// attenuate a cross-origin iframe. So SoundCloud played back noticeably
// louder than the studio engine (which mixes through masterIn/dbToGain) and
// the assistant (which has its own volume arg). Kevin, 2026-08-19: "audio
// output seems to be too loud".
//
// The only way to reach inside the widget is its Widget API, which is a
// postMessage protocol wrapped by SoundCloud's own api.js. We load that
// script on demand — the FIRST time a player actually mounts, never at boot —
// and drive setVolume through it. If the script fails to load (offline, CSP,
// SoundCloud down), every player still works; it just plays at the widget's
// own default, exactly as before.
//
// The level is a single app-wide preference in localStorage rather than
// per-player state: the floating mini player and the page player are the same
// audio to the person listening, and having one at 40% and the other at 90%
// reads as a bug.

const API_SRC = 'https://w.soundcloud.com/player/api.js';

export const SC_VOLUME_KEY = 'gw:sc:volume';

/** Widget scale is 0..100. 70 is roughly "matches the rest of the app". */
export const DEFAULT_SC_VOLUME = 70;

interface SCWidget {
  bind(event: string, cb: () => void): void;
  setVolume(value: number): void;
}
interface SCGlobal {
  Widget: ((el: HTMLIFrameElement) => SCWidget) & { Events: { READY: string } };
}

function scGlobal(): SCGlobal | undefined {
  return (window as unknown as { SC?: SCGlobal }).SC;
}

let loader: Promise<SCGlobal | null> | null = null;

/** Inject SoundCloud's api.js once; resolves null if it can't be loaded. */
function loadWidgetApi(): Promise<SCGlobal | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  const existing = scGlobal();
  if (existing) return Promise.resolve(existing);
  if (loader) return loader;

  loader = new Promise<SCGlobal | null>((resolve) => {
    const prior = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    const script = prior ?? document.createElement('script');
    const done = () => resolve(scGlobal() ?? null);
    script.addEventListener('load', done);
    // Never reject: a missing volume control must not surface as an unhandled
    // rejection or block playback.
    script.addEventListener('error', () => resolve(null));
    if (!prior) {
      script.src = API_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return loader;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SC_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function read(): number {
  try {
    const raw = localStorage.getItem(SC_VOLUME_KEY);
    if (raw === null) return DEFAULT_SC_VOLUME;
    return clamp(Number(raw));
  } catch {
    // Private mode / storage disabled — fall back to the default rather than
    // leaving the widget at 100%.
    return DEFAULT_SC_VOLUME;
  }
}

let volume = read();
const listeners = new Set<() => void>();

export function getSoundCloudVolume(): number {
  return volume;
}

export function setSoundCloudVolume(next: number): void {
  const v = clamp(next);
  if (v === volume) return;
  volume = v;
  try {
    localStorage.setItem(SC_VOLUME_KEY, String(v));
  } catch { /* not persisted; still applied for this session */ }
  listeners.forEach((l) => l());
}

export function subscribeSoundCloudVolume(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Bind an embedded SoundCloud iframe to the app-wide volume: applies the
 * current level once the widget is ready, then re-applies on every change.
 * Returns a cleanup function. Safe to call with a null/absent element.
 */
export function attachSoundCloudVolume(iframe: HTMLIFrameElement | null): () => void {
  if (!iframe) return () => {};
  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  void loadWidgetApi().then((SC) => {
    if (disposed || !SC) return;
    let widget: SCWidget;
    try {
      widget = SC.Widget(iframe);
    } catch {
      return; // not a widget iframe (src not yet resolved) — leave it alone
    }
    const apply = () => {
      try { widget.setVolume(getSoundCloudVolume()); } catch { /* widget went away */ }
    };
    // READY fires once the widget's own JS is listening for commands; calling
    // setVolume before that is silently dropped.
    try {
      widget.bind(SC.Widget.Events.READY, () => { if (!disposed) apply(); });
    } catch {
      return;
    }
    unsubscribe = subscribeSoundCloudVolume(apply);
  });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}
