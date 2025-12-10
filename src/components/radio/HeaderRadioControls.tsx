import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Radio, Play, Pause, Volume2, VolumeX, Users, X, ChevronUp, Music2, Church, Sparkles, Check } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels, type RadioChannel } from '@/hooks/useRadioChannels';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// CSS class added to body when radio bar is open - used by other components to add padding
const RADIO_OPEN_CLASS = 'radio-bar-open';

export const HeaderRadioControls = () => {
  try {
    const [isOpen, setIsOpen] = useState(false);
    const { channels, selectedChannel, selectChannel } = useRadioChannels();
    const { themeName } = useTheme();
    
    // Theme-specific colors
    const isHbcuTheme = themeName === 'hbcu';
    const isSpelmanBlue = themeName === 'spelman-blue';
    const hbcuGold = '#FFDF00';
    const spelmanWhite = '#ffffff';
    
    const getTextColor = () => {
      if (isHbcuTheme) return hbcuGold;
      if (isSpelmanBlue) return spelmanWhite;
      return '#1e293b';
    };

    const getChannelIcon = (iconName: string | null) => {
      switch (iconName) {
        case 'Church': return Church;
        case 'Music2': return Music2;
        case 'Sparkles': return Sparkles;
        default: return Radio;
      }
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
      setVolume,
      switchStream,
    } = useRadioPlayer();

    const isMuted = volume === 0;

    const handleChannelChange = (channel: RadioChannel) => {
      selectChannel(channel);
      if (switchStream) {
        switchStream(channel.stream_url);
      }
    };

    // Add/remove body class when radio bar opens/closes
    useEffect(() => {
      if (isOpen) {
        document.body.classList.add(RADIO_OPEN_CLASS);
      } else {
        document.body.classList.remove(RADIO_OPEN_CLASS);
      }
      return () => {
        document.body.classList.remove(RADIO_OPEN_CLASS);
      };
    }, [isOpen]);

    return (
      <>
        {/* Header Radio Icon/Button */}
        <EnhancedTooltip content={isOpen ? "Close Radio" : "Open Glee World Radio"}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 hover:bg-white/10 transition-colors",
              isOpen && "bg-white/20"
            )}
            style={{ color: getTextColor() }}
            type="button"
          >
            <Radio className="h-4 w-4" />
            {isPlaying && (
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
            {isLive && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse">
                <div className="h-2 w-2 bg-white rounded-full absolute top-0.5 left-0.5" />
              </div>
            )}
          </Button>
        </EnhancedTooltip>

        {/* Full-Width Radio Bar - Rendered in Portal */}
        {isOpen && createPortal(
          <>
            {/* Backdrop - only below the header, doesn't cover header */}
            <div 
              className="fixed inset-x-0 bottom-0 z-[9998] bg-black/30"
              style={{ top: '60px' }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Horizontal Radio Bar - Connected directly to header */}
            <div 
              className={cn(
                "fixed left-0 right-0 z-[9999] bg-card border-b-2 border-primary/20 shadow-lg",
                "animate-in slide-in-from-top-2 duration-200"
              )}
              style={{ top: '60px' }} // Directly below header, no gap
            >
              <div className="max-w-7xl mx-auto px-3 py-1.5">
                {/* Main Row: Logo, Channels, Now Playing, Controls */}
                <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
                  
                  {/* Logo & Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="font-medium text-xs text-foreground hidden sm:inline">Radio</span>
                    <Badge 
                      variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        isLive ? "bg-red-500 hover:bg-red-600 text-white" : 
                        isOnline ? "bg-green-500 hover:bg-green-600 text-white" : ""
                      )}
                    >
                      {isLive ? 'LIVE' : isOnline ? 'ON' : 'OFF'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground items-center gap-0.5 hidden sm:flex">
                      <Users className="h-2.5 w-2.5" />
                      {listenerCount}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="hidden lg:block h-5 w-px bg-border" />

                  {/* Channel Selector - Horizontal Pills */}
                  {channels.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0 scrollbar-hide">
                      {channels.map((channel) => {
                        const IconComponent = getChannelIcon(channel.icon);
                        const isSelected = selectedChannel?.id === channel.id;
                        return (
                          <button
                            key={channel.id}
                            onClick={() => handleChannelChange(channel)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full transition-all whitespace-nowrap",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <IconComponent 
                              className="h-3 w-3" 
                              style={{ color: isSelected ? undefined : (channel.color || undefined) }}
                            />
                            <span className="text-[10px] font-medium">{channel.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="hidden lg:block h-5 w-px bg-border" />

                  {/* Now Playing */}
                  <div className="flex-1 min-w-0 hidden md:flex items-center gap-2">
                    {currentTrack && isOnline ? (
                      <>
                        {isPlaying && (
                          <div className="flex gap-0.5 flex-shrink-0">
                            {[1, 2, 3].map((i) => (
                              <div 
                                key={i}
                                className="w-0.5 bg-primary rounded-full animate-pulse"
                                style={{ 
                                  height: `${6 + i * 3}px`,
                                  animationDelay: `${i * 0.15}s`
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] font-medium truncate text-foreground">{currentTrack.title}</span>
                        {currentTrack.artist && (
                          <span className="text-[10px] text-muted-foreground truncate">— {currentTrack.artist}</span>
                        )}
                      </>
                    ) : !isOnline ? (
                      <span className="text-[10px] text-muted-foreground">Offline</span>
                    ) : null}
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    {/* Play/Pause */}
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      disabled={isLoading || !isOnline}
                      className="h-6 w-6 p-0 rounded-full"
                      type="button"
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3 ml-0.5" />
                      )}
                    </Button>

                    {/* Volume Control */}
                    <div className="items-center gap-1.5 hidden sm:flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setVolume(isMuted ? 0.7 : 0);
                        }}
                        type="button"
                      >
                        {isMuted ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </Button>
                      <Slider
                        value={[volume]}
                        onValueChange={([value]) => setVolume(value)}
                        max={1}
                        step={0.05}
                        className="w-16"
                      />
                    </div>

                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-6 w-6 p-0"
                      type="button"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Mobile: Now Playing Row */}
                <div className="md:hidden mt-1.5 pt-1.5 border-t border-border/50">
                  {currentTrack && isOnline ? (
                    <div className="flex items-center gap-2">
                      {isPlaying && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1, 2, 3].map((i) => (
                            <div 
                              key={i}
                              className="w-0.5 bg-primary rounded-full animate-pulse"
                              style={{ 
                                height: `${5 + i * 2}px`,
                                animationDelay: `${i * 0.15}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] font-medium truncate text-foreground">{currentTrack.title}</span>
                      {currentTrack.artist && (
                        <span className="text-[10px] text-muted-foreground truncate">— {currentTrack.artist}</span>
                      )}
                    </div>
                  ) : !isOnline ? (
                    <p className="text-[10px] text-muted-foreground text-center">Offline</p>
                  ) : null}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </>
    );
  } catch (error) {
    console.error('HeaderRadioControls: Error rendering component:', error);
    return <div>Radio Error</div>;
  }
};
