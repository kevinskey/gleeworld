
import { useEffect, useRef } from "react";
import { Accidental, Formatter, KeySignature, Renderer, Stave, StaveNote, Voice, VoiceMode } from "vexflow";

export type Clef = "treble" | "bass" | "alto" | "tenor";

type ScoreNote = {
  keys: string[];
  duration?: string;
  accidentals?: (string | null)[];
};

type Props = {
  clef?: Clef;
  keySig?: string;
  notes: ScoreNote[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  beatValue?: number;
};

export default function Score({
  clef = "treble",
  keySig,
  notes,
  width,
  height = 160,
  beatsPerMeasure = 4,
  beatValue = 4,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const noteCount = Math.max(1, notes.length);
    const computedWidth = width ?? Math.max(200, 100 + noteCount * 48);

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(computedWidth, height);
    const ctx = renderer.getContext();

    const stave = new Stave(10, 20, computedWidth - 20);
    stave.addClef(clef);
    if (keySig) stave.addKeySignature(keySig);
    stave.setContext(ctx).draw();

    const staveNotes = notes.map((n) => {
      const sn = new StaveNote({ keys: n.keys, duration: n.duration ?? "w", clef });
      n.accidentals?.forEach((acc, i) => {
        if (acc) sn.addModifier(new Accidental(acc), i);
      });
      return sn;
    });

    const totalBeats = staveNotes.reduce((sum, n) => {
      const d = n.getDuration();
      const beats = d === "w" ? 4 : d === "h" ? 2 : d === "q" ? 1 : d === "8" ? 0.5 : 1;
      return sum + beats;
    }, 0);
    const voice = new Voice({ numBeats: Math.max(beatsPerMeasure, totalBeats), beatValue });
    voice.setMode(VoiceMode.SOFT);
    voice.addTickables(staveNotes);

    new Formatter().joinVoices([voice]).format([voice], computedWidth - 80);
    voice.draw(ctx, stave);
  }, [clef, keySig, notes, width, height, beatsPerMeasure, beatValue]);

  return (
    <div className="max-w-full overflow-x-auto">
      <div ref={ref} className="inline-block" />
    </div>
  );
}

export function keySignatureNotes(sig: string): string[] {
  try {
    const ks = new KeySignature(sig);
    // VexFlow internal not used; return empty to keep call safe.
    void ks;
  } catch { /* ignore */ }
  return [];
}
