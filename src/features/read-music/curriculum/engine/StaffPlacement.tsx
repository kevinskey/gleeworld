import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { Clef } from '../../components/Staff';
import { POOLS } from '../../lib/notes';

type Props = {
  clef: Clef;
  targetKey: string;
  chosenKey: string | null;
  onSelect: (key: string) => void;
};

// Narrow logical width + responsive viewBox scaling = staff lines ~2x farther apart
// on a phone screen, so lines/spaces are big enough to tap accurately.
const WIDTH = 180;
const HEIGHT = 150;
const STAVE_Y = 30;

/**
 * Click-to-place: the 9 stepwise positions of the clef's note pool
 * (index 0 = bottom line) map to vertical click zones on the stave.
 */
export default function StaffPlacement({ clef, targetKey, chosenKey, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<{ bottomY: number; step: number } | null>(null);
  const answered = chosenKey !== null;
  const pool = POOLS[clef];

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    renderer.resize(WIDTH, HEIGHT);
    const ctx = renderer.getContext();
    const stave = new Stave(6, STAVE_Y, WIDTH - 12);
    stave.addClef(clef).setContext(ctx).draw();

    const spacing = stave.getSpacingBetweenLines();
    setZones({ bottomY: stave.getYForLine(4), step: spacing / 2 });

    const notes: StaveNote[] = [];
    if (answered) {
      const chosen = new StaveNote({ keys: [chosenKey!], duration: 'h', clef });
      chosen.setStyle({ fillStyle: chosenKey === targetKey ? '#059669' : '#dc2626', strokeStyle: chosenKey === targetKey ? '#059669' : '#dc2626' });
      notes.push(chosen);
      if (chosenKey !== targetKey) {
        const correct = new StaveNote({ keys: [targetKey], duration: 'h', clef });
        correct.setStyle({ fillStyle: '#059669', strokeStyle: '#059669' });
        notes.push(correct);
      }
    }
    if (notes.length) {
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
      voice.addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], WIDTH - 90);
      voice.draw(ctx, stave);
    }

    // Scale the SVG to the container width so the staff is big enough to tap on phones
    const svg = ref.current.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      // VexFlow sets inline style width/height; override so the SVG stretches
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.aspectRatio = `${WIDTH} / ${HEIGHT}`;
      svg.style.display = 'block';
    }
  }, [clef, targetKey, chosenKey, answered]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (answered || !zones) return;
    const svg = e.currentTarget.querySelector('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const y = (e.clientY - rect.top) / (rect.height / HEIGHT);
    const idx = Math.round((zones.bottomY - y) / zones.step);
    if (idx < 0 || idx >= pool.length) return;
    onSelect(pool[idx].key);
  };

  return (
    <div className="w-full max-w-[560px]">
      <div
        ref={ref}
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
        className={`rounded-md bg-white p-1 ${answered ? '' : 'cursor-crosshair'}`}
      />
      {!answered && <p className="mt-1 text-xs text-muted-foreground text-center">Tap the line or space on the staff</p>}
    </div>
  );
}
