import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Radio, Play, Pause, Volume2, VolumeX, Users } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { useTheme } from '@/contexts/ThemeContext';

export const HeaderRadioControls = () => {
  try {
    const [isExpanded, setIsExpanded] = useState(false);
    const radioData = useRadioPlayer();
    const { themeName } = useTheme();
    
    // Theme-specific colors
    const isHbcuTheme = themeName === 'hbcu';
    const isSpelmanBlue = themeName === 'spelman-blue';
    const hbcuGold = '#FFDF00';
    const spelmanWhite = '#ffffff';
    
    // Get the appropriate text color
    const getTextColor = () => {
      if (isHbcuTheme) return hbcuGold;
      if (isSpelmanBlue) return spelmanWhite;
      return '#1e293b';
    };
    
    const { 
      isPlaying, 
      isLoading, 
      isLive, 
      isOnline,
      listenerCount, 
      currentTrack, 
      volume, 
      togglePlayPause, 
      setVolume 
    } = radioData;

  const isMuted = volume === 0;

  return (
    <Popover open={isExpanded} onOpenChange={setIsExpanded}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2">
          <EnhancedTooltip 
            content={`Glee World Radio ${isOnline ? (isLive ? '(LIVE DJ)' : '(Online)') : '(Offline)'}`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePlayPause();
              }}
              disabled={isLoading}
              className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 hover:bg-white/10"
              style={{ color: getTextColor() }}
              type="button"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
              
              {isLive && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse">
                  <div className="h-2 w-2 bg-white rounded-full absolute top-0.5 left-0.5" />
                </div>
              )}
            </Button>
          </EnhancedTooltip>

          <EnhancedTooltip content="Glee World Radio Controls">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 sm:h-7 sm:px-2 hover:bg-white/10 hidden sm:flex"
                style={{ color: getTextColor() }}
              >
                <Radio className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Radio</span>
              </Button>
          </EnhancedTooltip>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-4 z-[150] relative" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              <h3 className="font-semibold">Glee World Radio</h3>
            </div>
            <Badge 
              variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
              className={isLive ? "bg-red-500 hover:bg-red-600" : isOnline ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {isLive ? 'LIVE DJ' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>

          {/* Now Playing */}
          {currentTrack && isOnline && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">NOW PLAYING</p>
              <p className="font-medium text-sm">{currentTrack.title}</p>
              {currentTrack.artist && (
                <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{listenerCount} listeners</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Est. 1924 • 100+ Years
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePlayPause();
                }}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
                <span className="ml-2">
                  {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
                </span>
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 flex-1 max-w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVolume(isMuted ? 0.7 : 0);
                }}
                type="button"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={([value]) => setVolume(value)}
                max={1}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              "To Amaze and Inspire" • Official Spelman Glee Club Radio
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
  } catch (error) {
    console.error('HeaderRadioControls: Error rendering component:', error);
    return <div>Radio Error</div>;
  }
};