import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Radio, Music, Mic, Clock } from 'lucide-react';

interface NowPlayingStripProps {
  isVisible: boolean;
}

interface CurrentTrack {
  title: string;
  artist: string;
  category: 'performance' | 'announcement' | 'alumni_story' | 'live';
  startTime?: string;
}

export const NowPlayingStrip = ({ isVisible }: NowPlayingStripProps) => {
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack>({
    title: 'Lift Every Voice and Sing',
    artist: 'Spelman College Glee Club',
    category: 'performance',
    startTime: '7:45 PM'
  });

  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
    } else {
      setShowAnimation(false);
    }
  }, [isVisible]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <Music className="h-3 w-3" />;
      case 'announcement':
        return <Mic className="h-3 w-3" />;
      case 'alumni_story':
        return <Radio className="h-3 w-3" />;
      case 'live':
        return <Radio className="h-3 w-3 text-red-500" />;
      default:
        return <Music className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'announcement':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'alumni_story':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'live':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 
        text-white shadow-lg border-t-2 border-white/20
        transition-all duration-500 ease-in-out
        ${showAnimation ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-full opacity-0'}
      `}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Now Playing Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-medium">NOW PLAYING</span>
            </div>
            
            <div className="hidden sm:block w-px h-4 bg-white/30"></div>
            
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm sm:text-base truncate">
                    {currentTrack.title}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs border ${getCategoryColor(currentTrack.category)} bg-white/10 backdrop-blur-sm`}
                  >
                    {getCategoryIcon(currentTrack.category)}
                    <span className="ml-1 hidden sm:inline capitalize">
                      {currentTrack.category.replace('_', ' ')}
                    </span>
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-white/80 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          </div>

          {/* Time and Station ID */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {currentTrack.startTime && (
              <div className="hidden md:flex items-center gap-1 text-sm text-white/80">
                <Clock className="h-3 w-3" />
                <span>{currentTrack.startTime}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold">Glee World 101</p>
                <p className="text-xs text-white/80">FM 101.1</p>
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Radio className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 w-full bg-white/20 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: '35%' }}
          ></div>
        </div>
      </div>
    </div>
  );
};