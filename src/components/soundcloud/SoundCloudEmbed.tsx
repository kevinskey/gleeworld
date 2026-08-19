import { useEffect, useRef, useState } from 'react';
import {
  buildResolvedSoundCloudEmbedUrl,
  type SoundCloudEmbedOptions,
} from '@/lib/soundcloud';
import { attachSoundCloudVolume } from '@/lib/soundcloud/widgetVolume';

interface SoundCloudEmbedProps extends SoundCloudEmbedOptions {
  url: string;
  title?: string;
  /** Fixed pixel height; omit to fill the parent (h-full). */
  height?: number;
  className?: string;
}

/**
 * SoundCloud widget iframe that resolves the permalink through oEmbed
 * first — feeding the widget a raw soundcloud.com permalink makes it die
 * with its sad-face page for many public resources. All in-app SoundCloud
 * embeds should go through this component, not a hand-built iframe.
 */
export function SoundCloudEmbed({
  url,
  title,
  height,
  className,
  color,
  autoPlay,
  visual,
}: SoundCloudEmbedProps) {
  const [src, setSrc] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    buildResolvedSoundCloudEmbedUrl(url, { color, autoPlay, visual }).then((s) => {
      if (alive) setSrc(s);
    });
    return () => {
      alive = false;
    };
  }, [url, color, autoPlay, visual]);

  // Bind to the app-wide volume once the resolved src has mounted a real
  // widget iframe — the widget otherwise plays at 100%, well above everything
  // else in the app.
  useEffect(() => attachSoundCloudVolume(src ? frameRef.current : null), [src]);

  const style = height !== undefined ? { height } : undefined;

  if (!src) {
    return (
      <div
        className={`bg-muted animate-pulse ${height === undefined ? 'h-full' : ''} ${className ?? ''}`}
        style={style}
        aria-label="Loading SoundCloud player"
      />
    );
  }

  return (
    <iframe
      ref={frameRef}
      title={title || 'SoundCloud player'}
      src={src}
      className={`w-full block border-0 ${height === undefined ? 'h-full' : ''} ${className ?? ''}`}
      style={style}
      allow="autoplay"
      scrolling="no"
    />
  );
}
