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
import { HEADER_ICON_SIZES } from '@/components/layout/headerIconSizes';

// CSS class added to body when radio bar is open - used by other components to add padding
const RADIO_OPEN_CLASS = 'radio-bar-open';

export const HeaderRadioControls = () => {
  try {
    const [isOpen, setIsOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const { channels, selectedChannel, selectChannel, isLoading: channelsLoading } = useRadioChannels();
    const { themeName } = useTheme();
    const radioBarRef = useRef<HTMLDivElement>(null);
    
    // Use theme CSS variables - icons inherit from parent which uses theme tokens
    const isHbcuTheme = themeName === 'hbcu';

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
              `relative ${HEADER_ICON_SIZES.button} p-0 hover:bg-white/10 transition-colors rounded-full`,
              isOpen && "bg-white/20"
            )}
            type="button"
          >
            <Radio className={HEADER_ICON_SIZES.icon} />
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

        {/* Full-Screen Radio Dropdown - Rendered in Portal */}
        {isOpen && createPortal(
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Full-Screen Radio Panel */}
            <div
              className="fixed inset-x-0 top-0 bottom-0 z-[9999] flex flex-col"
              style={{ paddingTop: `var(--gw-header-h, ${headerHeight}px)` }}
            >
              <div
                ref={radioBarRef}
                className="flex-1 bg-popover/95 backdrop-blur-md border-b-2 border-primary/40 shadow-2xl overflow-y-auto"
              >
                {/* Close Button - Top Right */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 h-10 w-10 p-0 text-popover-foreground/70 hover:text-popover-foreground hover:bg-white/10 z-10"
                  type="button"
                >
                  <X className="h-6 w-6" />
                </Button>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Radio className="h-8 w-8 text-primary" />
                      <h2 className="text-2xl sm:text-3xl font-bold text-popover-foreground">Glee World Radio</h2>
                    </div>
                    <p className="text-popover-foreground/60 text-sm">Select a channel and enjoy the music</p>
                  </div>

                  {/* Status & Controls Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                    <Badge 
                      variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
                      className={cn(
                        "text-sm h-8 px-4",
                        isLive ? "bg-red-500 hover:bg-red-600 text-white" : 
                        isOnline ? "bg-green-500 hover:bg-green-600 text-white" : "bg-popover-foreground/20 text-popover-foreground/70"
                      )}
                    >
                      {isLive ? '🔴 LIVE' : isOnline ? '🟢 ON AIR' : '⚫ OFFLINE'}
                    </Badge>
                    
                    {/* Large Play/Pause Button */}
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="lg"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      disabled={isLoading || !isOnline}
                      className="h-14 w-14 rounded-full p-0"
                      type="button"
                    >
                      {isLoading ? (
                        <div className="h-6 w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-7 w-7" />
                      ) : (
                        <Play className="h-7 w-7 ml-1" />
                      )}
                    </Button>

                    <div className="flex items-center gap-2 text-popover-foreground/60">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{listenerCount} listeners</span>
                    </div>
                  </div>

                  {/* Channel Grid */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-popover-foreground mb-4 text-center">Channels</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {channels.length > 0 && channels.map((channel) => {
                        const isSelected = selectedChannel?.id === channel.id;
                        const isThisLoading = isLoading && isSelected;
                        const ChannelIcon = getChannelIcon(channel.icon);
                        return (
                          <button
                            key={channel.id}
                            onClick={() => handleChannelChange(channel)}
                            disabled={isLoading}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-medium transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                                : "bg-popover-foreground/10 text-popover-foreground/70 hover:bg-popover-foreground/20 hover:text-popover-foreground hover:scale-102",
                              isLoading && "opacity-70 cursor-wait"
                            )}
                          >
                            {isThisLoading ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              <ChannelIcon className="h-6 w-6" />
                            )}
                            <span className="text-center line-clamp-2">{channel.name}</span>
                            {isSelected && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Now Playing Section */}
                  {currentTrack && isOnline && (
                    <div className="bg-popover-foreground/10 rounded-xl p-6 mb-8">
                      <h3 className="text-lg font-semibold text-popover-foreground mb-4 flex items-center gap-2">
                        <Music2 className="h-5 w-5 text-primary" />
                        Now Playing
                      </h3>
                      <div className="text-center">
                        <p className="text-xl font-bold text-popover-foreground mb-1">{currentTrack.title}</p>
                        {currentTrack.artist && (
                          <p className="text-popover-foreground/60">{currentTrack.artist}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Volume Control */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-popover-foreground/70 hover:text-popover-foreground hover:bg-white/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVolume(isMuted ? 0.7 : 0);
                      }}
                      type="button"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <Slider
                      value={[volume]}
                      onValueChange={([value]) => setVolume(value)}
                      max={1}
                      step={0.05}
                      className="w-48"
                    />
                    <span className="text-sm text-popover-foreground/60 w-12 text-right">
                      {Math.round(volume * 100)}%
                    </span>
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
