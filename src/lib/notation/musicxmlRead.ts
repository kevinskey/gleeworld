import { ticksToDur } from './duration';
import { EditorScore, EditorElement, noteOf, restOf, Pitch } from './model';
import { LYRIC_OFFSET_FIELD, BARS_PER_LINE_FIELD } from './musicxmlWrite';

const SIGN_CLEF: Record<string, EditorScore['clef']> = { G: 'treble', F: 'bass', C: 'alto' };

/**
 * The lyric nudge the writer parked in <miscellaneous-field>, if it wrote one.
 *
 * Returns undefined for every score that has no such field — which is every
 * score written before this existed, and every score any other program wrote.
 * Undefined, not 0, because the model distinguishes "no preference recorded"
 * from "recorded, and it is zero", and only the former should ever be dropped
 * again on the next save.
 *
 * Anything unparseable is treated as absent rather than as NaN: a corrupt
 * field should engrave a normal score, not one whose every lyric coordinate
 * is NaN and therefore never painted.
 */
function miscField(doc: Document, name: string): number | undefined {
  const fields = Array.from(doc.getElementsByTagName('miscellaneous-field'));
  const field = fields.find((f) => f.getAttribute('name') === name);
  if (!field) return undefined;
  const value = Number.parseFloat(field.textContent ?? '');
  return Number.isFinite(value) ? value : undefined;
}

function lyricOffsetOf(doc: Document): number | undefined {
  return miscField(doc, LYRIC_OFFSET_FIELD);
}

/** The author's bars-per-system request, if one was recorded. Anything below
 *  one bar is nonsense rather than a preference and is dropped — a system
 *  cannot hold half a measure, and a zero here would starve the packer. */
function barsPerLineOf(doc: Document): number | undefined {
  const value = miscField(doc, BARS_PER_LINE_FIELD);
  if (value === undefined || value < 1) return undefined;
  return Math.round(value);
}

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
  const lyricOffset = lyricOffsetOf(doc);
  const barsPerLine = barsPerLineOf(doc);

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
    // Spread rather than assigned, so a score with no recorded preference
    // comes back with no such key at all — `{...score, lyricOffset: undefined}`
    // would serialise differently and read differently to Object.keys.
    ...(lyricOffset != null ? { lyricOffset } : {}),
    ...(barsPerLine != null ? { barsPerLine } : {}),
  };
}
