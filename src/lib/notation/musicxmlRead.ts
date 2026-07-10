import { ticksToDur } from './duration';
import { EditorScore, EditorElement, noteOf, restOf, Pitch } from './model';

const SIGN_CLEF: Record<string, EditorScore['clef']> = { G: 'treble', F: 'bass', C: 'alto' };

function textOf(parent: Element | null, tag: string): string | null {
  const el = parent?.getElementsByTagName(tag)[0];
  return el ? el.textContent : null;
}

export function musicXmlToEditorScore(xml: string): EditorScore {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('notation: invalid MusicXML');

  const title = textOf(doc.documentElement, 'work-title') ?? 'Untitled exercise';
  const attrs = doc.getElementsByTagName('attributes')[0] ?? null;
  const keyFifths = parseInt(textOf(attrs, 'fifths') ?? '0', 10);
  const mode = (textOf(attrs, 'mode') as EditorScore['mode']) ?? 'major';
  const beats = parseInt(textOf(attrs, 'beats') ?? '4', 10);
  const beatType = parseInt(textOf(attrs, 'beat-type') ?? '4', 10);
  const sign = textOf(attrs, 'sign') ?? 'G';
  const clef = SIGN_CLEF[sign] ?? 'treble';
  const soundTempo = parseInt(doc.getElementsByTagName('sound')[0]?.getAttribute('tempo') ?? '', 10);
  const tempo = Number.isNaN(soundTempo) ? 120 : soundTempo;

  const elements: EditorElement[] = [];
  const noteEls = Array.from(doc.getElementsByTagName('note'));
  for (const note of noteEls) {
    const dur = parseInt(textOf(note, 'duration') ?? '0', 10);
    const parsed = ticksToDur(dur);
    if (!parsed) continue;               // unsupported duration in Phase 1 — skip, Phase 2 handles tuplets
    const { base, dots } = parsed;
    if (note.getElementsByTagName('rest').length) {
      elements.push(restOf(base, dots));
      continue;
    }
    const pitchEl = note.getElementsByTagName('pitch')[0];
    const step = (textOf(pitchEl, 'step') ?? 'C') as Pitch['step'];
    const octave = parseInt(textOf(pitchEl, 'octave') ?? '4', 10);
    const alter = parseInt(textOf(pitchEl, 'alter') ?? '0', 10);
    const n = noteOf({ step, octave, alter }, base, dots);
    const tied = note.getElementsByTagName('tie')[0];
    if (tied) n.tie = tied.getAttribute('type') === 'stop' ? 'stop' : 'start';
    const lyricText = textOf(note.getElementsByTagName('lyric')[0] ?? null, 'text');
    if (lyricText) n.lyric = lyricText;
    elements.push(n);
  }

  return {
    title,
    keyFifths, mode,
    timeSig: { beats, beatType },
    clef,
    tempo,
    elements,
  };
}
