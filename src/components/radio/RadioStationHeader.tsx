import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Rss, Mic, Users, Play, Pause } from 'lucide-react';

interface RadioStationHeaderProps {
  listenerCount?: number;
  isLive?: boolean;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  currentTrack?: {
    title: string;
    artist: string;
  } | null;
}

export const RadioStationHeader = ({ 
  listenerCount = 127, 
  isLive = true,
  isPlaying = false,
  onPlayToggle,
  currentTrack
}: RadioStationHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-spelman-blue-dark to-brand-700 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      
      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <img 
                src="/glee-100-crest.png" 
                alt="Glee Club 100th Anniversary Crest" 
                className="h-24 w-24 object-contain bg-white/10 rounded-full p-2 backdrop-blur-sm"
              />
              {isLive && (
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="h-3 w-3 bg-white rounded-full"></div>
                </div>
              )}
            </div>
            
            <div className="text-left">
              <h1 className="text-5xl lg:text-6xl font-bold font-playfair mb-2">
                Glee World 101
              </h1>
              <p className="text-xl lg:text-2xl text-white/90 font-roboto mb-4">
                The Official Radio Station of Spelman College Glee Club
              </p>
              <p className="text-lg text-white/80 font-roboto italic">
                "To Amaze and Inspire" • Celebrating 100+ Years of Musical Excellence
              </p>
            </div>
          </div>

          {/* Status and Stats */}
          <div className="flex-1 lg:text-right">
            <div className="flex flex-wrap justify-center lg:justify-end gap-3 mb-4">
              <Badge className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm">
                <Radio className="h-4 w-4 mr-2" />
                {isLive ? 'LIVE ON AIR' : 'OFF AIR'}
              </Badge>
              <Badge variant="outline" className="border-white/30 text-white hover:bg-white/10 px-4 py-2 text-sm">
                <Rss className="h-4 w-4 mr-2" />
                Podcast Available
              </Badge>
              <Badge variant="outline" className="border-white/30 text-white hover:bg-white/10 px-4 py-2 text-sm">
                <Mic className="h-4 w-4 mr-2" />
                Broadcasting 24/7
              </Badge>
            </div>
            
            <div className="flex items-center justify-center lg:justify-end gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold text-lg">{listenerCount}</span>
                <span className="text-white/70">listeners</span>
              </div>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="text-sm">
                <div className="font-semibold">Est. 1924</div>
                <div className="text-white/70">100+ Years Strong</div>
              </div>
            </div>
          </div>
        </div>

        {/* Now Playing & Controls */}
        <div className="mt-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Currently Playing Info */}
          <div className="flex-1">
            {currentTrack ? (
              <div className="text-center lg:text-left">
                <p className="text-sm text-white/70 mb-1">NOW PLAYING</p>
                <h3 className="text-xl font-semibold text-white">{currentTrack.title}</h3>
                <p className="text-white/80">{currentTrack.artist}</p>
              </div>
            ) : (
              <div className="text-center lg:text-left">
                <p className="text-sm text-white/70 mb-1">READY TO PLAY</p>
                <h3 className="text-xl font-semibold text-white">Select a track to start broadcasting</h3>
              </div>
            )}
          </div>

          {/* Play Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={onPlayToggle}
              size="lg"
              className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/40 backdrop-blur-sm transition-all duration-300"
              disabled={!onPlayToggle}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white ml-1" />
              )}
            </Button>
            <div className="text-center lg:text-left">
              <p className="text-sm text-white/70">
                {isPlaying ? 'BROADCASTING' : 'PAUSED'}
              </p>
              <p className="text-xs text-white/60">
                Click to {isPlaying ? 'pause' : 'play'}
              </p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mt-8 pt-8 border-t border-white/20">
          <p className="text-lg lg:text-xl text-white/90 font-roboto">
            Broadcasting the voices, stories, and spirit of Spelman College Glee Club to the world
          </p>
        </div>
      </div>
    </div>
  );
};