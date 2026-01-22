import React from 'react';
import { Youtube, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@spelmancollegegleeclub';

// Featured videos - can be extended to fetch from YouTube API or database
const featuredVideos = [
  {
    id: 'video1',
    title: 'Spelman College Glee Club Performance',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    videoId: 'dQw4w9WgXcQ'
  },
  {
    id: 'video2', 
    title: 'Christmas Concert Highlights',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    videoId: 'dQw4w9WgXcQ'
  },
  {
    id: 'video3',
    title: 'Spring Tour 2025',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    videoId: 'dQw4w9WgXcQ'
  }
];

export const YouTubeChannelSlider: React.FC = () => {
  const handleChannelClick = () => {
    window.open(YOUTUBE_CHANNEL_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <button
        onClick={handleChannelClick}
        style={{ fontFamily: "'Cinzel', serif" }}
        className="w-full h-12 gap-2 text-sm sm:text-xl bg-gradient-to-b from-[#CC0000] via-[#990000] to-[#660000] text-white flex items-center justify-start text-left px-3 sm:px-6 lg:px-8 shadow-lg border-t border-t-white/20 hover:brightness-110 transition-all"
      >
        <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
        YouTube Channel
        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-auto opacity-70" />
      </button>

      {/* Video Slider */}
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] py-4 px-3 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {featuredVideos.map((video) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 group"
            >
              <div className="relative w-48 sm:w-64 aspect-video rounded-lg overflow-hidden border-2 border-white/10 hover:border-[#CC0000] transition-all shadow-lg">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#CC0000] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-white/80 font-medium truncate max-w-48 sm:max-w-64">
                {video.title}
              </p>
            </a>
          ))}
          
          {/* View All Card */}
          <button
            onClick={handleChannelClick}
            className="flex-shrink-0 w-48 sm:w-64 aspect-video rounded-lg border-2 border-dashed border-white/30 hover:border-[#CC0000] transition-all flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10"
          >
            <Youtube className="w-8 h-8 sm:w-10 sm:h-10 text-[#CC0000]" />
            <span className="text-white/80 text-sm font-medium">View All Videos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeChannelSlider;
