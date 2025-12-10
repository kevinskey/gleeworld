import { useState } from 'react';
import { Play } from 'lucide-react';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '@/utils/youtubeUtils';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
}

export function YouTubeEmbed({ videoId, title, className = '', autoplay = false }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);

  if (isPlaying) {
    return (
      <div className={`relative w-full aspect-video rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={getYouTubeEmbedUrl(videoId, true)}
          title={title || 'YouTube video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer group ${className}`}
      onClick={() => setIsPlaying(true)}
    >
      {/* Thumbnail */}
      <img
        src={getYouTubeThumbnail(videoId, 'high')}
        alt={title || 'YouTube video thumbnail'}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="h-8 w-8 text-white fill-current ml-1" />
        </div>
      </div>
      
      {/* YouTube badge */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        YouTube
      </div>

      {/* Title if provided */}
      {title && (
        <div className="absolute bottom-2 right-2 left-16 bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
          {title}
        </div>
      )}
    </div>
  );
}
