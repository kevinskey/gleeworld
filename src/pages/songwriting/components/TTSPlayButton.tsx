// Ported from the standalone songwriter app's client/src/components/TTSPlayButton.tsx.
// Play/stop logic (buildLines, speakLines wiring, cleanup on unmount / song
// change) kept byte-identical to the source — only imports and Tailwind
// classes changed for this app's light theme + shadcn design tokens.
//
// Deliberate deviation from the source (per this task's explicit brief):
// the source rendered a disabled "▶ Play lyrics" button when speech
// synthesis is unsupported. Here the component renders nothing at all in
// that case, so unsupported browsers don't see a dead control in the toolbar.

import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/lib/songwriting/types';
import { isSpeechSynthesisSupported, speakLines } from '@/lib/songwriting/speech';

function buildLines(song: Song): string[] {
  const out: string[] = [];
  if (song.title && song.title.trim() && song.title.trim() !== 'Untitled') {
    out.push(song.title.trim());
  }
  for (const section of song.sections) {
    const label = section.label || section.type;
    const lines = section.lines.filter((l) => l.trim());
    if (lines.length === 0) continue;
    if (label) out.push(label);
    out.push(...lines);
  }
  return out;
}

export default function TTSPlayButton({ song }: { song: Song }) {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const supported = isSpeechSynthesisSupported();

  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, []);

  // Stop if the song id changes underneath us
  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
      setPlaying(false);
    };
  }, [song.id]);

  function play() {
    const lines = buildLines(song);
    if (lines.length === 0) return;
    const handle = speakLines(lines, { rate: 0.95 });
    stopRef.current = handle.stop;
    setPlaying(true);
    handle.promise.then(() => {
      stopRef.current = null;
      setPlaying(false);
    });
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  }

  if (!supported) {
    return null;
  }

  return (
    <button
      onClick={playing ? stop : play}
      className={`text-xs px-2 py-1 rounded-md border transition-colors ${
        playing
          ? 'border-primary text-primary bg-primary/5'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
      }`}
      title={playing ? 'Stop playback' : 'Read lyrics aloud'}
    >
      {playing ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Stop
        </span>
      ) : (
        '▶ Play lyrics'
      )}
    </button>
  );
}
