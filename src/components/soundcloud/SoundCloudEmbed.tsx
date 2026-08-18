import { useEffect, useState } from 'react';
import {
  buildResolvedSoundCloudEmbedUrl,
  type SoundCloudEmbedOptions,
} from '@/lib/soundcloud';

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
      title={title || 'SoundCloud player'}
      src={src}
      className={`w-full block border-0 ${height === undefined ? 'h-full' : ''} ${className ?? ''}`}
      style={style}
      allow="autoplay"
      scrolling="no"
    />
  );
}
