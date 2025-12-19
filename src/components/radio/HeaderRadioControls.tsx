import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Radio, Play, Pause, Volume2, VolumeX, Users, X, ChevronUp, Music2, Church, Sparkles, Check, Bell, MapPin, Mic, Disc, Clock, Music, Loader2, Shield, Heart, Star, Globe, Film } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels, type RadioChannel } from '@/hooks/useRadioChannels';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// CSS class added to body when radio bar is open - used by other components to add padding
const RADIO_OPEN_CLASS = 'radio-bar-open';

export const HeaderRadioControls = () => {
  try {
    const [isOpen, setIsOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const { channels, selectedChannel, selectChannel, isLoading: channelsLoading } = useRadioChannels();
    const { themeName } = useTheme();
    const radioBarRef = useRef<HTMLDivElement>(null);
    
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
        case 'Bell': return Bell;
        case 'MapPin': return MapPin;
        case 'Mic': return Mic;
        case 'Disc': return Disc;
        case 'Clock': return Clock;
        case 'Music': return Music;
        case 'Users': return Users;
        case 'Shield': return Shield;
        case 'Heart': return Heart;
        case 'Star': return Star;
        case 'Globe': return Globe;
        case 'Film': return Film;
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

    const handleChannelChange = async (channel: RadioChannel) => {
      selectChannel(channel);
      
      // Switch to the channel's stream URL to play that station
      if (channel.stream_url) {
        await switchStream(channel.stream_url);
        toast.success(`Switched to ${channel.name}`);
      }
    };

    // Calculate header height dynamically
    useEffect(() => {
      const updateHeaderHeight = () => {
        const header = document.querySelector('header');
        if (header) {
          setHeaderHeight(header.getBoundingClientRect().height);
        }
      };
      
      updateHeaderHeight();
      window.addEventListener('resize', updateHeaderHeight);
      
      // Also observe for DOM changes
      const observer = new ResizeObserver(updateHeaderHeight);
      const header = document.querySelector('header');
      if (header) observer.observe(header);
      
      return () => {
        window.removeEventListener('resize', updateHeaderHeight);
        observer.disconnect();
      };
    }, []);

    // Add/remove body class and set CSS variable for radio bar height when it opens/closes
    useEffect(() => {
      if (isOpen) {
        document.body.classList.add(RADIO_OPEN_CLASS);
        // Measure radio bar height after render and set CSS variable
        const updateRadioBarHeight = () => {
          if (radioBarRef.current) {
            const height = radioBarRef.current.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--gw-radio-bar-height', `${height}px`);
          }
        };
        // Delay to ensure the bar is rendered
        requestAnimationFrame(updateRadioBarHeight);
        window.addEventListener('resize', updateRadioBarHeight);
        return () => {
          window.removeEventListener('resize', updateRadioBarHeight);
        };
      } else {
        document.body.classList.remove(RADIO_OPEN_CLASS);
        document.documentElement.style.setProperty('--gw-radio-bar-height', '0px');
      }
      return () => {
        document.body.classList.remove(RADIO_OPEN_CLASS);
        document.documentElement.style.setProperty('--gw-radio-bar-height', '0px');
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
              "relative h-9 w-9 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 hover:bg-white/10 transition-colors rounded-full",
              isOpen && "bg-white/20"
            )}
            style={{ color: getTextColor() }}
            type="button"
          >
            <Radio className="h-5 w-5 md:h-6 md:w-6" />
            {isPlaying && (
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
            )}
            {isLive && (
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full animate-pulse">
                <div className="h-2 w-2 bg-white rounded-full absolute top-0.5 left-0.5" />
              </div>
            )}
          </Button>
        </EnhancedTooltip>

        {/* Full-Width Radio Bar - Rendered in Portal */}
        {isOpen && createPortal(
          <>
            
            {/* Horizontal Radio Bar - Connected directly to header */}
            <div 
              ref={radioBarRef}
              className={cn(
                "fixed left-0 right-0 z-[9999] bg-popover border-b-2 border-primary/40 shadow-lg"
              )}
              style={{ top: `${headerHeight}px` }}
            >
              <div className="max-w-7xl mx-auto px-3 py-1.5 relative">
                {/* Close Button - Top Right */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-1 right-2 h-5 w-5 p-0 text-popover-foreground/70 hover:text-popover-foreground hover:bg-white/10"
                  type="button"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>

                {/* Top Row: Channel Scroller - Single Line */}
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-popover-foreground/20 scrollbar-track-transparent pr-8">
                  <div className="flex items-center gap-1.5 pb-1">
                    {channels.length > 0 && channels.map((channel) => {
                      const isSelected = selectedChannel?.id === channel.id;
                      const isThisLoading = isLoading && isSelected;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => handleChannelChange(channel)}
                          disabled={isLoading}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-popover-foreground/10 text-popover-foreground/70 hover:bg-popover-foreground/20 hover:text-popover-foreground",
                            isLoading && "opacity-70 cursor-wait"
                          )}
                        >
                          {isThisLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          {channel.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Logo, Status, Play Button, Listener Count, Now Playing, Volume */}
                <div className="flex items-center gap-3 mt-2 flex-wrap lg:flex-nowrap pr-8">
                  {/* Logo & Status with Play Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Radio className="h-4 w-4 text-primary" />
                    <Badge 
                      variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        isLive ? "bg-red-500 hover:bg-red-600 text-white" : 
                        isOnline ? "bg-green-500 hover:bg-green-600 text-white" : "bg-popover-foreground/20 text-popover-foreground/70"
                      )}
                    >
                      {isLive ? 'LIVE' : isOnline ? 'ON' : 'OFF'}
                    </Badge>
                    
                    {/* Play/Pause - Horizontal Pill */}
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      disabled={isLoading || !isOnline}
                      className="h-7 px-4 rounded-full"
                      type="button"
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </Button>

                    <span className="text-[10px] text-popover-foreground/60 items-center gap-0.5 hidden sm:flex">
                      <Users className="h-2.5 w-2.5" />
                      {listenerCount}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="hidden lg:block h-5 w-px bg-popover-foreground/20" />

                  {/* Scrolling Now Playing Ticker */}
                  {currentTrack && isOnline && (
                    <div className="relative overflow-hidden flex-1 h-6 bg-popover-foreground/10 px-2">
                      <div 
                        className="absolute whitespace-nowrap flex items-center h-full gap-8"
                        style={{ animation: 'marquee 90s linear infinite' }}
                      >
                        <span className="text-xs">
                          <span className="text-primary font-semibold">Now Playing:</span>{' '}
                          <span className="text-popover-foreground">{currentTrack.title}</span>
                          {currentTrack.artist && <span className="text-popover-foreground/60"> — {currentTrack.artist}</span>}
                        </span>
                        <span className="text-xs text-popover-foreground/40">•</span>
                        <span className="text-xs">
                          <span className="text-primary/70 font-semibold">Up Next:</span>{' '}
                          <span className="text-popover-foreground/60">More from {selectedChannel?.name || 'Glee World Radio'}</span>
                        </span>
                        <span className="text-xs text-popover-foreground/40">•</span>
                        <span className="text-xs">
                          <span className="text-primary font-semibold">Now Playing:</span>{' '}
                          <span className="text-popover-foreground">{currentTrack.title}</span>
                          {currentTrack.artist && <span className="text-popover-foreground/60"> — {currentTrack.artist}</span>}
                        </span>
                        <span className="text-xs text-popover-foreground/40">•</span>
                        <span className="text-xs">
                          <span className="text-primary/70 font-semibold">Up Next:</span>{' '}
                          <span className="text-popover-foreground/60">More from {selectedChannel?.name || 'Glee World Radio'}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Volume Control */}
                  <div className="items-center gap-1.5 flex ml-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-popover-foreground/70 hover:text-popover-foreground hover:bg-white/10"
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
