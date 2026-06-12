import { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { NotationSpec } from './types';

export default function Notation({ spec, width = 260, height = 150 }: { spec: NotationSpec; width?: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    try {
      const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      const stave = new Stave(10, 20, width - 20);
      stave.addClef(spec.clef).setContext(ctx).draw();
      const note = new StaveNote({ keys: spec.keys, duration: spec.duration ?? 'w', clef: spec.clef });
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
      voice.addTickables([note]);
      new Formatter().joinVoices([voice]).format([voice], width - 90);
      voice.draw(ctx, stave);
    } catch {
      // bad notation spec — leave blank rather than crash the quiz
    }
  }, [spec, width, height]);

  return <div ref={ref} className="inline-block rounded-md bg-white p-1" />;
}
