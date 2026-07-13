// Pure clip math shared by StudioEditor's keyboard shortcuts and the
// touch selection action bar. No DOM, no engine — unit-testable.

interface AudioClipLike {
  id: string;
  kind: string;
  start_seconds: number;
  duration_seconds: number;
  offset_seconds: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  [k: string]: unknown;
}

/** Split the audio clip `clipId` at absolute timeline position `pos`.
 * Returns [left, right] replacements, or null when the position doesn't
 * fall strictly inside the clip (same guard the B-key handler always had).
 * MIDI clips are handled separately in the editor (they split notes). */
export function splitAudioClips<T extends AudioClipLike>(
  clips: T[],
  clipId: string,
  pos: number,
  newId: () => string,
): [T, T] | null {
  const c = clips.find((x) => x.id === clipId);
  if (!c) return null;
  const inside = pos > c.start_seconds && pos < c.start_seconds + c.duration_seconds;
  if (!inside) return null;
  const leftDur = pos - c.start_seconds;
  const rightDur = c.duration_seconds - leftDur;
  const left = {
    ...c, id: newId(),
    duration_seconds: leftDur,
    fade_out_seconds: Math.min(c.fade_out_seconds, leftDur / 2),
  };
  const right = {
    ...c, id: newId(),
    start_seconds: pos,
    duration_seconds: rightDur,
    offset_seconds: c.offset_seconds + leftDur,
    fade_in_seconds: Math.min(c.fade_in_seconds, rightDur / 2),
  };
  return [left, right];
}

export interface ClipSliceParams {
  offset_seconds: number;
  duration_seconds: number;
  gain_db: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  reverse: boolean;
}

/** Extract a clip's audible samples from its source asset channels:
 * slice offset→duration, apply clip gain and linear fades, honor
 * reverse. Returns fresh Float32Arrays (source untouched). Used by the
 * per-clip MP3 export. pitch_semitones/time_stretch are intentionally
 * NOT applied (v1 exports at source pitch/tempo — spec'd non-goal). */
export function sliceClipChannels(
  channels: Float32Array[],
  sampleRate: number,
  p: ClipSliceParams,
): Float32Array[] {
  const startSample = Math.max(0, Math.round(p.offset_seconds * sampleRate));
  const wantSamples = Math.max(0, Math.round(p.duration_seconds * sampleRate));
  const gain = Math.pow(10, p.gain_db / 20);
  const fadeIn = Math.round(p.fade_in_seconds * sampleRate);
  const fadeOut = Math.round(p.fade_out_seconds * sampleRate);

  return channels.map((src) => {
    const end = Math.min(src.length, startSample + wantSamples);
    const n = Math.max(0, end - startSample);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Reverse matches playback semantics (Tone.Player.reverse flips the
      // ENTIRE source buffer, then plays [offset, offset+duration) of the
      // flipped buffer) — NOT a reversal of the forward window.
      const srcIdx = p.reverse ? src.length - 1 - (startSample + i) : startSample + i;
      let v = src[srcIdx] * gain;
      if (fadeIn > 0 && i < fadeIn) v *= i / fadeIn;
      if (fadeOut > 0 && i >= n - fadeOut) v *= (n - i) / fadeOut;
      out[i] = v;
    }
    return out;
  });
}

/** Copy a clip (audio or MIDI) under a new id — the pure half of
 * option-drag duplication (Logic/GarageBand style: a copy stays at the
 * original position while the drag moves the original to the drop
 * point). Deep-copies `notes` and `cc` (MIDI clips) so mutating the
 * copy — dragging a note, editing velocity — never aliases the
 * original's arrays/objects. Other fields are scalars and safe to
 * shallow-spread. */
export function duplicateClip<T extends { id: string }>(clip: T, newId: string): T {
  const copy: T = { ...clip, id: newId };
  const withNotes = copy as unknown as { notes?: unknown[] };
  if (Array.isArray(withNotes.notes)) {
    withNotes.notes = withNotes.notes.map((n) => ({ ...(n as object) }));
  }
  const withCc = copy as unknown as { cc?: unknown[] };
  if (Array.isArray(withCc.cc)) {
    withCc.cc = withCc.cc.map((c) => ({ ...(c as object) }));
  }
  return copy;
}
