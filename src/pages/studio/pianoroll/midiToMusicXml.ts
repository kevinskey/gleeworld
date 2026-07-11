// MIDI clip → MusicXML for the piano roll's read-only Score view.
// Pure string generation, no DOM — unit-tested in midiToMusicXml.test.ts.
//
// Approach (v1, preview-grade):
//   • Quantize onsets/durations to 16th-note ticks (DIV=4 per quarter).
//   • Flatten to ONE voice: notes sharing an onset become a chord (the
//     group takes its longest duration); a note overlapping the NEXT
//     onset is truncated to it. Real multi-voice engraving is out of
//     scope for a preview.
//   • Gaps become rests; runs split at measure boundaries and decompose
//     into standard symbols (whole…16th, single dots) tied together.
//   • Clef picked by median pitch (below middle C → bass).

import type { MidiClip } from '@/lib/studio/session';

export interface MidiScoreOpts {
  tempoBpm: number;
  numerator: number;
  denominator: number;
  partName?: string;
}

/** Divisions per quarter note — 4 = 16th-note resolution. */
export const SCORE_DIVISIONS = 4;

const PITCH_SPELL: Array<{ step: string; alter: number }> = [
  { step: 'C', alter: 0 }, { step: 'C', alter: 1 }, { step: 'D', alter: 0 }, { step: 'D', alter: 1 },
  { step: 'E', alter: 0 }, { step: 'F', alter: 0 }, { step: 'F', alter: 1 }, { step: 'G', alter: 0 },
  { step: 'G', alter: 1 }, { step: 'A', alter: 0 }, { step: 'A', alter: 1 }, { step: 'B', alter: 0 },
];

/** Note symbols expressible without ties, largest first (ticks at DIV=4). */
const SYMBOLS: Array<{ ticks: number; type: string; dots: number }> = [
  { ticks: 24, type: 'whole', dots: 1 },
  { ticks: 16, type: 'whole', dots: 0 },
  { ticks: 12, type: 'half', dots: 1 },
  { ticks: 8, type: 'half', dots: 0 },
  { ticks: 6, type: 'quarter', dots: 1 },
  { ticks: 4, type: 'quarter', dots: 0 },
  { ticks: 3, type: 'eighth', dots: 1 },
  { ticks: 2, type: 'eighth', dots: 0 },
  { ticks: 1, type: '16th', dots: 0 },
];

/** Greedy decomposition of a tick run into displayable symbols. */
export function decomposeTicks(ticks: number): Array<{ ticks: number; type: string; dots: number }> {
  const out: Array<{ ticks: number; type: string; dots: number }> = [];
  let left = ticks;
  while (left > 0) {
    const sym = SYMBOLS.find((s) => s.ticks <= left)!;
    out.push(sym);
    left -= sym.ticks;
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Item { rest: boolean; start: number; dur: number; pitches: number[] }

function pitchXml(p: number): string {
  const { step, alter } = PITCH_SPELL[p % 12];
  const octave = Math.floor(p / 12) - 1;
  return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>`;
}

export function midiClipToMusicXml(clip: MidiClip, opts: MidiScoreOpts): string {
  const tickSec = (60 / opts.tempoBpm) / SCORE_DIVISIONS;
  const measureTicks = Math.max(1, Math.round(opts.numerator * SCORE_DIVISIONS * (4 / opts.denominator)));

  // Quantize + sort.
  const qs = clip.notes
    .map((n) => ({
      pitch: n.pitch,
      start: Math.max(0, Math.round(n.start_seconds / tickSec)),
      dur: Math.max(1, Math.round(n.duration_seconds / tickSec)),
    }))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);

  // Chord-group same onsets (longest duration wins), truncate overlaps.
  const groups: Item[] = [];
  for (const q of qs) {
    const g = groups[groups.length - 1];
    if (g && g.start === q.start) {
      if (!g.pitches.includes(q.pitch)) g.pitches.push(q.pitch);
      g.dur = Math.max(g.dur, q.dur);
    } else {
      groups.push({ rest: false, start: q.start, dur: q.dur, pitches: [q.pitch] });
    }
  }
  for (let i = 0; i < groups.length - 1; i++) {
    groups[i].dur = Math.max(1, Math.min(groups[i].dur, groups[i + 1].start - groups[i].start));
  }

  // Fill gaps with rests; pad to whole measures (at least one).
  const items: Item[] = [];
  let cursor = 0;
  for (const g of groups) {
    if (g.start > cursor) items.push({ rest: true, start: cursor, dur: g.start - cursor, pitches: [] });
    items.push(g);
    cursor = g.start + g.dur;
  }
  const totalTicks = Math.max(measureTicks, Math.ceil(cursor / measureTicks) * measureTicks);
  if (cursor < totalTicks) items.push({ rest: true, start: cursor, dur: totalTicks - cursor, pitches: [] });

  // Clef by median pitch.
  const sorted = clip.notes.map((n) => n.pitch).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 60;
  const clef = median < 60 ? { sign: 'F', line: 4 } : { sign: 'G', line: 2 };

  // Serialize measure by measure.
  const measureCount = totalTicks / measureTicks;
  const measures: string[] = Array.from({ length: measureCount }, () => '');

  for (const item of items) {
    // Split the run at measure boundaries.
    let segStart = item.start;
    let left = item.dur;
    const segments: Array<{ start: number; dur: number }> = [];
    while (left > 0) {
      const measureEnd = (Math.floor(segStart / measureTicks) + 1) * measureTicks;
      const dur = Math.min(left, measureEnd - segStart);
      segments.push({ start: segStart, dur });
      segStart += dur; left -= dur;
    }
    // Decompose each segment into symbols; ties link every note piece.
    const pieces: Array<{ start: number; ticks: number; type: string; dots: number }> = [];
    for (const seg of segments) {
      // Whole-measure rest → single measure rest, no decomposition.
      if (item.rest && seg.dur === measureTicks && seg.start % measureTicks === 0) {
        pieces.push({ start: seg.start, ticks: seg.dur, type: 'measure-rest', dots: 0 });
        continue;
      }
      let s = seg.start;
      for (const sym of decomposeTicks(seg.dur)) {
        pieces.push({ start: s, ticks: sym.ticks, type: sym.type, dots: sym.dots });
        s += sym.ticks;
      }
    }
    pieces.forEach((piece, pi) => {
      const m = Math.floor(piece.start / measureTicks);
      if (item.rest) {
        measures[m] += piece.type === 'measure-rest'
          ? `<note><rest measure="yes"/><duration>${piece.ticks}</duration><voice>1</voice></note>`
          : `<note><rest/><duration>${piece.ticks}</duration><voice>1</voice><type>${piece.type}</type>${'<dot/>'.repeat(piece.dots)}</note>`;
        return;
      }
      const tieStart = pi < pieces.length - 1;
      const tieStop = pi > 0;
      const ties = `${tieStop ? '<tie type="stop"/>' : ''}${tieStart ? '<tie type="start"/>' : ''}`;
      const tied = (tieStart || tieStop)
        ? `<notations>${tieStop ? '<tied type="stop"/>' : ''}${tieStart ? '<tied type="start"/>' : ''}</notations>`
        : '';
      item.pitches.forEach((p, idx) => {
        measures[m] += `<note>${idx > 0 ? '<chord/>' : ''}${pitchXml(p)}<duration>${piece.ticks}</duration>${ties}<voice>1</voice><type>${piece.type}</type>${'<dot/>'.repeat(piece.dots)}${tied}</note>`;
      });
    });
  }

  const attributes =
    `<attributes><divisions>${SCORE_DIVISIONS}</divisions>` +
    `<key><fifths>0</fifths></key>` +
    `<time><beats>${opts.numerator}</beats><beat-type>${opts.denominator}</beat-type></time>` +
    `<clef><sign>${clef.sign}</sign><line>${clef.line}</line></clef></attributes>` +
    `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(opts.tempoBpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(opts.tempoBpm)}"/></direction>`;

  const body = measures
    .map((content, i) => `<measure number="${i + 1}">${i === 0 ? attributes : ''}${content}</measure>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<score-partwise version="3.1">` +
    `<part-list><score-part id="P1"><part-name>${esc(opts.partName ?? 'MIDI')}</part-name></score-part></part-list>` +
    `<part id="P1">${body}</part>` +
    `</score-partwise>`;
}
