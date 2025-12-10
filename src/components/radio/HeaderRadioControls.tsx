import { useState } from 'react';
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
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Horizontal Radio Bar */}
            <div 
              className={cn(
                "fixed left-0 right-0 z-[9999] bg-card border-b border-border shadow-xl",
                "animate-in slide-in-from-top duration-300"
              )}
              style={{ top: '60px' }} // Below the header
            >
              <div className="max-w-7xl mx-auto px-4 py-3">
                {/* Main Row: Logo, Channels, Now Playing, Controls */}
                <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
                  
                  {/* Logo & Status */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Radio className="h-5 w-5 text-primary" />
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-semibold text-sm text-foreground">Glee World Radio</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
                          className={cn(
                            "text-[10px] h-5",
                            isLive ? "bg-red-500 hover:bg-red-600 text-white" : 
                            isOnline ? "bg-green-500 hover:bg-green-600 text-white" : ""
                          )}
                        >
                          {isLive ? 'LIVE DJ' : isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {listenerCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden lg:block h-10 w-px bg-border" />

                  {/* Channel Selector - Horizontal Pills */}
                  {channels.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:inline">
                        Channels:
                      </span>
                      <div className="flex gap-1.5">
                        {channels.map((channel) => {
                          const IconComponent = getChannelIcon(channel.icon);
                          const isSelected = selectedChannel?.id === channel.id;
                          return (
                            <button
                              key={channel.id}
                              onClick={() => handleChannelChange(channel)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <IconComponent 
                                className="h-3.5 w-3.5" 
                                style={{ color: isSelected ? undefined : (channel.color || undefined) }}
                              />
                              <span className="text-xs font-medium">{channel.name}</span>
                              {isSelected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="hidden lg:block h-10 w-px bg-border" />

                  {/* Now Playing */}
                  <div className="flex-1 min-w-0 hidden md:block">
                    {currentTrack && isOnline ? (
                      <div className="flex items-center gap-3">
                        {isPlaying && (
                          <div className="flex gap-0.5 flex-shrink-0">
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
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Now Playing</p>
                          <p className="font-medium text-sm truncate text-foreground">{currentTrack.title}</p>
                          {currentTrack.artist && (
                            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                          )}
                        </div>
                      </div>
                    ) : !isOnline ? (
                      <p className="text-sm text-muted-foreground">Radio is currently offline</p>
                    ) : null}
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
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
                      className="h-9 px-4"
                      type="button"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                      <span className="ml-2 hidden sm:inline">
                        {isLoading ? 'Connecting...' : isPlaying ? 'Pause' : 'Play'}
                      </span>
                    </Button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2 hidden sm:flex">
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
                        step={0.05}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>

                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                      type="button"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Mobile: Now Playing Row */}
                <div className="md:hidden mt-3 pt-3 border-t border-border">
                  {currentTrack && isOnline ? (
                    <div className="flex items-center gap-3">
                      {isPlaying && (
                        <div className="flex gap-0.5 flex-shrink-0">
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
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate text-foreground">{currentTrack.title}</p>
                        {currentTrack.artist && (
                          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                        )}
                      </div>
                      {/* Mobile Volume */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setVolume(isMuted ? 0.7 : 0);
                          }}
                          type="button"
                        >
                          {isMuted ? (
                            <VolumeX className="h-3.5 w-3.5" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Slider
                          value={[volume]}
                          onValueChange={([value]) => setVolume(value)}
                          max={1}
                          step={0.05}
                          className="w-20"
                        />
                      </div>
                    </div>
                  ) : !isOnline ? (
                    <p className="text-sm text-muted-foreground text-center">Radio is currently offline</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center italic">"To Amaze and Inspire"</p>
                  )}
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
