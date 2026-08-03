// Compact 30-second audio preview strip for store cards/detail (per the
// 2026-08-03 desktop/iPad store model). Renders only when the partner
// uploaded a sample. Playback is capped at PREVIEW_SECONDS client-side so
// a full-length upload still behaves like a teaser.
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ASSETS_BUCKET = 'partner-assets';
const PREVIEW_SECONDS = 30;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function StoreAudioPreview({ path, className }: { path: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const toggle = (e: React.MouseEvent) => {
    // Cards wrap in Links — a preview tap must never navigate.
    e.preventDefault();
    e.stopPropagation();
    let audio = audioRef.current;
    if (!audio) {
      const url = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
      audio = new Audio(url);
      audio.preload = 'none';
      audio.ontimeupdate = () => {
        const t = audio!.currentTime;
        setElapsed(Math.min(t, PREVIEW_SECONDS));
        if (t >= PREVIEW_SECONDS) {
          audio!.pause();
          audio!.currentTime = 0;
          setPlaying(false);
          setElapsed(0);
        }
      };
      audio.onended = () => { setPlaying(false); setElapsed(0); };
      audio.onerror = () => { setPlaying(false); };
      audioRef.current = audio;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Pause audio preview' : 'Play audio preview'}
      className={`flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors w-full ${className ?? ''}`}
    >
      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
        {playing ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-px" />}
      </span>
      Audio Preview
      <span className="ml-auto text-muted-foreground tabular-nums">
        {fmt(elapsed)} / {fmt(PREVIEW_SECONDS)}
      </span>
    </button>
  );
}
