// Mini note map drawn inside a timeline MIDI clip block: x = time,
// y = pitch normalized to the clip's own range, alpha = velocity.
// Memoized — redraws only when the notes array identity changes.

import { memo, useEffect, useRef } from 'react';
import type { MidiNote } from '@/lib/studio/session';

export const MidiClipPreview = memo(function MidiClipPreview({
  notes, durationSeconds,
}: { notes: MidiNote[]; durationSeconds: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!notes.length || durationSeconds <= 0) return;
    const cs = getComputedStyle(canvas);
    const fg = cs.getPropertyValue('--primary-foreground').trim();
    g.fillStyle = fg ? `hsl(${fg})` : '#ffffff';
    const lo = Math.min(...notes.map((n) => n.pitch)) - 1;
    const hi = Math.max(...notes.map((n) => n.pitch)) + 1;
    const span = Math.max(hi - lo, 8); // floor so a one-pitch clip isn't a full-height bar
    for (const n of notes) {
      const x = (n.start_seconds / durationSeconds) * w;
      const bw = Math.max(2, (n.duration_seconds / durationSeconds) * w);
      const y = h - ((n.pitch - lo) / span) * (h - 3) - 3;
      g.globalAlpha = 0.4 + 0.6 * (n.velocity / 127);
      g.fillRect(x, y, bw, 2);
    }
    g.globalAlpha = 1;
  }, [notes, durationSeconds]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
});
