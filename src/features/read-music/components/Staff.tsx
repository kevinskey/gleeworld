
import { useEffect, useRef } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter } from "vexflow";

export type Clef = "treble" | "bass" | "alto" | "tenor";

type Props = {
  clef: Clef;
  noteKey: string;
  width?: number;
  height?: number;
};

export default function Staff({ clef, noteKey, width = 260, height = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const stave = new Stave(10, 20, width - 20);
    stave.addClef(clef).setContext(ctx).draw();

    const note = new StaveNote({ keys: [noteKey], duration: "w", clef });
    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], width - 80);
    voice.draw(ctx, stave);
  }, [clef, noteKey, width, height]);

  return <div ref={ref} className="inline-block" />;
}
