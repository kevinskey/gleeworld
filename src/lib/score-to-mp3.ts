/**
 * Convert a MIDI or MusicXML file (uploaded by a director) into an MP3 blob
 * the rest of the Part Tracks pipeline can play, mix, and stream like any
 * other recording.
 *
 * Synthesis is intentionally simple: triangle-wave oscillators with a piano-ish
 * ADSR envelope rendered via OfflineAudioContext at 44.1 kHz, then encoded to
 * 128 kbps MP3 by the existing mp3-encoder.worker. Not a soundfont, but more
 * than good enough for a practice accompaniment.
 *
 * MusicXML support uses verovio (lazy-loaded so the toolkit's WASM payload
 * isn't in the main bundle). On browsers/environments where verovio fails to
 * load, we surface a clean error to the caller.
 */
import { Midi } from '@tonejs/midi';

const SAMPLE_RATE = 44100;

const midiNoteToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

async function midiBufferToMp3(midiBytes: ArrayBuffer): Promise<Blob> {
  const midi = new Midi(midiBytes);
  // Total length: longest note end time + a half-second tail.
  let endTime = 0;
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      endTime = Math.max(endTime, note.time + note.duration);
    }
  }
  if (endTime <= 0) throw new Error('MIDI file has no notes');

  const length = Math.ceil((endTime + 0.5) * SAMPLE_RATE);
  const offline = new OfflineAudioContext({
    numberOfChannels: 1,
    length,
    sampleRate: SAMPLE_RATE,
  });
  const masterGain = offline.createGain();
  masterGain.gain.value = 0.5; // headroom so summed voices don't clip
  masterGain.connect(offline.destination);

  for (const track of midi.tracks) {
    for (const note of track.notes) {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiNoteToFreq(note.midi);

      const t0 = note.time;
      const dur = Math.max(0.05, note.duration);
      const peak = Math.max(0.05, Math.min(1, note.velocity)) * 0.6;
      const attack = 0.005;
      const decay = Math.min(0.15, dur * 0.3);
      const sustain = peak * 0.7;
      const release = Math.min(0.2, dur * 0.3);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + attack);
      gain.gain.linearRampToValueAtTime(sustain, t0 + attack + decay);
      const releaseStart = t0 + dur - release;
      gain.gain.setValueAtTime(sustain, Math.max(t0 + attack + decay, releaseStart));
      gain.gain.linearRampToValueAtTime(0, t0 + dur);

      osc.connect(gain).connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
  }

  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);

  // Encode via the same worker the mic recorder uses.
  const worker = new Worker(
    new URL('@/lib/mp3-encoder.worker.ts', import.meta.url),
    { type: 'module' },
  );
  const mp3: Uint8Array = await new Promise((resolve, reject) => {
    worker.onmessage = (e) => { resolve(e.data.mp3); worker.terminate(); };
    worker.onerror = (e) => { worker.terminate(); reject(e); };
    // Copy the samples — they live in the rendered AudioBuffer and we can't
    // transfer that backing memory.
    const copy = new Float32Array(samples);
    worker.postMessage({ samples: copy, sampleRate: SAMPLE_RATE, bitrate: 128 }, [copy.buffer]);
  });
  return new Blob([mp3], { type: 'audio/mpeg' });
}

// Verovio is large (~5 MB WASM). Lazy-load only when a MusicXML file is
// actually uploaded so the main bundle stays slim for everyone else.
let verovioPromise: Promise<any> | null = null;
async function loadVerovioToolkit(): Promise<any> {
  if (!verovioPromise) {
    verovioPromise = (async () => {
      const mod: any = await import(/* @vite-ignore */ 'verovio');
      // verovio ships a few entry points across versions; sniff for a Toolkit
      // constructor we can call.
      const ToolkitCtor =
        mod?.VerovioToolkit
        ?? mod?.default?.VerovioToolkit
        ?? mod?.Toolkit
        ?? mod?.default?.Toolkit;
      if (!ToolkitCtor) throw new Error('verovio Toolkit not found');
      // Some builds require waiting on a module-init promise.
      const initPromise =
        mod?.module?.onRuntimeInitialized
        ?? mod?.default?.module?.onRuntimeInitialized;
      if (typeof initPromise === 'function') await new Promise<void>(r => initPromise(() => r()));
      return new ToolkitCtor();
    })();
  }
  return verovioPromise;
}

async function musicxmlStringToMp3(musicxml: string): Promise<Blob> {
  const toolkit = await loadVerovioToolkit();
  const loaded = toolkit.loadData(musicxml);
  if (loaded === false) throw new Error('verovio could not parse this MusicXML');
  const midiBase64: string = toolkit.renderToMIDI();
  if (!midiBase64) throw new Error('verovio returned no MIDI');
  const bin = atob(midiBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return midiBufferToMp3(bytes.buffer);
}

export type ScoreKind = 'midi' | 'musicxml' | 'audio' | 'unknown';

export function detectScoreKind(file: File): ScoreKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.mid') || name.endsWith('.midi')) return 'midi';
  if (name.endsWith('.musicxml') || name.endsWith('.mxl') || name.endsWith('.xml')) return 'musicxml';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
}

/**
 * Top-level entry point. Returns a Blob the caller can upload as audio_url.
 * For plain audio files, returns the file untouched. For MIDI / MusicXML,
 * renders to MP3 first.
 */
export async function scoreFileToAudioBlob(file: File): Promise<{ blob: Blob; ext: string }> {
  const kind = detectScoreKind(file);
  if (kind === 'audio') return { blob: file, ext: file.name.split('.').pop() ?? 'mp3' };
  if (kind === 'midi') {
    const bytes = await file.arrayBuffer();
    const blob = await midiBufferToMp3(bytes);
    return { blob, ext: 'mp3' };
  }
  if (kind === 'musicxml') {
    if (file.name.toLowerCase().endsWith('.mxl')) {
      throw new Error('Compressed MusicXML (.mxl) is not supported yet — export as plain .musicxml');
    }
    const text = await file.text();
    const blob = await musicxmlStringToMp3(text);
    return { blob, ext: 'mp3' };
  }
  throw new Error(`Unsupported file type: ${file.type || file.name}`);
}
