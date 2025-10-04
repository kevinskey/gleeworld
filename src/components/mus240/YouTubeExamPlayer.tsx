import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface YouTubeExamPlayerProps {
  videoId: string;
  title?: string;
}

export const YouTubeExamPlayer: React.FC<YouTubeExamPlayerProps> = ({ videoId, title = 'Audio Excerpt' }) => {
  const [showPlayer, setShowPlayer] = useState(false);

  if (showPlayer) {
    return (
      <iframe
        width="100%"
        height="200"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        frameBorder={0}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="rounded-md"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border">
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={`${title} thumbnail`}
          className="w-full h-[200px] object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="default" onClick={() => setShowPlayer(true)}>
          Play Excerpt
        </Button>
        <a
          href={`https://youtu.be/${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Open in YouTube (new tab)
        </a>
      </div>
      <p className="text-xs opacity-70">
        If the embedded player is blocked by your network, use the YouTube link.
      </p>
    </div>
  );
};
