import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Radio, Play, Pause, Volume2, VolumeX, Users, X, ChevronDown } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { useTheme } from '@/contexts/ThemeContext';

export const HeaderRadioControls = () => {
  try {
    const [isOpen, setIsOpen] = useState(false);
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
      <div className="relative">
        {/* Header Buttons */}
        <div className="flex items-center gap-1">
          {/* Play/Pause Button - Always visible */}
          <EnhancedTooltip 
            content={`${isPlaying ? 'Pause' : 'Play'} Glee World Radio ${isOnline ? (isLive ? '(LIVE DJ)' : '') : '(Offline)'}`}
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
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

          {/* Radio Dropdown Trigger */}
          <EnhancedTooltip content="Open Radio Controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 px-1.5 sm:h-7 sm:px-2 hover:bg-white/10 hidden sm:flex items-center gap-1"
              style={{ color: getTextColor() }}
              type="button"
            >
              <Radio className="h-4 w-4" />
              <span className="text-xs font-medium">Radio</span>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </EnhancedTooltip>
        </div>

        {/* Dropdown Card */}
        {isOpen && (
          <>
          {/* Backdrop to close on outside click */}
            <div 
              className="fixed inset-0 z-[1050]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Radio Card */}
            <Card className="absolute right-0 top-full mt-2 w-80 z-[1100] bg-card border border-border shadow-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Radio className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Glee World Radio</CardTitle>
                      <p className="text-xs text-muted-foreground">Est. 1924 • 100+ Years</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
                      className={isLive ? "bg-red-500 hover:bg-red-600 text-white" : isOnline ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                    >
                      {isLive ? 'LIVE DJ' : isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-6 w-6 p-0"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                {/* Now Playing */}
                {currentTrack && isOnline && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Now Playing</p>
                    <p className="font-semibold text-sm">{currentTrack.title}</p>
                    {currentTrack.artist && (
                      <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
                    )}
                  </div>
                )}

                {!isOnline && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Radio is currently offline</p>
                  </div>
                )}

                {/* Listener Count */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{listenerCount} listener{listenerCount !== 1 ? 's' : ''}</span>
                  </div>
                  {isPlaying && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{ 
                              height: `${8 + i * 4}px`,
                              animationDelay: `${i * 0.15}s`
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-primary font-medium">LIVE</span>
                    </div>
                  )}
                </div>

                {/* Play/Pause Control */}
                <div className="flex items-center gap-3">
                  <Button
                    variant={isPlaying ? "secondary" : "default"}
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    disabled={isLoading || !isOnline}
                    className="flex-1"
                    type="button"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? 'Connecting...' : isPlaying ? 'Pause' : 'Play'}
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
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
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* Footer */}
                <div className="text-center pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">
                    "To Amaze and Inspire"
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Official Spelman College Glee Club Radio
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  } catch (error) {
    console.error('HeaderRadioControls: Error rendering component:', error);
    return <div>Radio Error</div>;
  }
};
