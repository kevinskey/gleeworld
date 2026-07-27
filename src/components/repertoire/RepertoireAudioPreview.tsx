import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREVIEW_EVENT = 'gw-repertoire-preview-play';

interface Props {
  url: string;
  ownerId: string;
}

export function RepertoireAudioPreview({ url, ownerId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      const detail = (e as CustomEvent<{ ownerId: string }>).detail;
      if (detail.ownerId !== ownerId && audioRef.current) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener(PREVIEW_EVENT, onOtherPlay);
    return () => window.removeEventListener(PREVIEW_EVENT, onOtherPlay);
  }, [ownerId]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { ownerId } }));
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={toggle} aria-label={playing ? 'Pause preview' : 'Play preview'}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <span className="text-xs text-muted-foreground">Preview</span>
    </div>
  );
}
