export interface SpeechInputSource {
  available: boolean;
  start(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void): void;
  stop(): void;
}

const MUTE_KEY = 'gw-assistant-muted';

export function getSpeechInput(win?: Window & typeof globalThis): SpeechInputSource {
  const w = (win ?? (typeof window !== 'undefined' ? window : undefined)) as any;
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Ctor) {
    return { available: false, start: () => {}, stop: () => {} };
  }
  let rec: any = null;
  return {
    available: true,
    start(onResult, onEnd) {
      rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
          if (e.results[i].isFinal) isFinal = true;
        }
        onResult(transcript, isFinal);
      };
      rec.onend = onEnd;
      rec.onerror = onEnd;
      rec.start();
    },
    stop() {
      try { rec?.stop(); } catch { /* already stopped */ }
      rec = null;
    },
  };
}

export function isMuted(storage?: Storage): boolean {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  return s?.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean, storage?: Storage): void {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (muted) s?.setItem(MUTE_KEY, '1');
  else s?.removeItem(MUTE_KEY);
}

export function speak(text: string, opts?: { muted?: boolean; synth?: SpeechSynthesis }): void {
  const muted = opts?.muted ?? isMuted();
  if (muted || !text.trim()) return;
  const synth = opts?.synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  if (!synth) return;
  synth.cancel();
  const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
  const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
  synth.speak(utterance);
}
