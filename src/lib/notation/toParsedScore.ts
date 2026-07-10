import { EditorScore } from './model';
import { editorScoreToIR } from './toIR';
import { layoutMeasures } from './measures';
import type { ParsedScore, ParsedNote } from '@/lib/sightReading/musicXMLParser';

// Playback-ready projection of an authored score, built straight from the in-memory
// EditorScore (via the IR) rather than re-parsing serialized MusicXML with the lossy
// sight-reading parser. Because it goes through editorScoreToIR it inherits faithful
// tie-merging — a start/stop pair becomes ONE sustained note instead of two re-attacks.

const PC_STEP = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B']; // spelling for logs only

export function editorScoreToParsed(score: EditorScore): ParsedScore {
  const secondsPerBeat = 60 / score.tempo;
  const ir = editorScoreToIR(score); // merges tied notes, skips rests, advances beatPos past them
  const notes: ParsedNote[] = (ir?.notes ?? []).map((n) => {
    const pc = ((n.midi % 12) + 12) % 12;
    return {
      step: PC_STEP[pc],
      octave: Math.floor(n.midi / 12) - 1,
      frequency: 440 * Math.pow(2, (n.midi - 69) / 12),
      duration: n.durationBeats * secondsPerBeat,   // seconds
      startTime: n.beatPos * secondsPerBeat,        // seconds from the start
    };
  });

  // measures.length drives the click-track length. Scheduling is purely by absolute
  // startTime, so every note lives in the first bucket and later measures stay empty.
  const measureCount = Math.max(1, layoutMeasures(score).length);
  const measures = Array.from({ length: measureCount }, (_, i) => ({
    number: i + 1,
    notes: i === 0 ? notes : [],
  }));

  const totalDuration = notes.length ? Math.max(...notes.map((n) => n.startTime + n.duration)) : 0;
  return { measures, tempo: score.tempo, timeSignature: score.timeSig, totalDuration };
}
