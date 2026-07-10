declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || 'en-US';
  return rec;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

type SpeakOpts = {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | null;
  onLine?: (index: number) => void;
};

export function speakLines(
  lines: string[],
  opts: SpeakOpts = {}
): { stop: () => void; promise: Promise<void> } {
  if (!isSpeechSynthesisSupported() || lines.length === 0) {
    return { stop: () => {}, promise: Promise.resolve() };
  }
  const synth = window.speechSynthesis;
  let cancelled = false;
  let watchdog: number | null = null;

  // Chrome silently pauses long synthesis runs; nudge it back to life.
  watchdog = window.setInterval(() => {
    if (cancelled) return;
    if (synth.speaking && synth.paused) synth.resume();
  }, 8000);

  const promise = new Promise<void>((resolve) => {
    let i = 0;
    const speakNext = () => {
      if (cancelled || i >= lines.length) {
        if (watchdog) window.clearInterval(watchdog);
        resolve();
        return;
      }
      const text = lines[i];
      const idx = i;
      i += 1;
      if (!text || !text.trim()) {
        speakNext();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      if (opts.rate != null) u.rate = opts.rate;
      if (opts.pitch != null) u.pitch = opts.pitch;
      if (opts.voice) u.voice = opts.voice;
      u.onstart = () => opts.onLine?.(idx);
      u.onend = () => speakNext();
      u.onerror = () => speakNext();
      synth.speak(u);
    };
    speakNext();
  });

  const stop = () => {
    cancelled = true;
    if (watchdog) window.clearInterval(watchdog);
    try { synth.cancel(); } catch { /* noop */ }
  };

  return { stop, promise };
}
