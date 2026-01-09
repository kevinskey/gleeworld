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

        {/* Radio Tuner Strip - Rendered in Portal */}
        {isOpen && createPortal(
          <>
            {/* Radio Tuner Bar - Sleek horizontal strip */}
            <div
              className="fixed left-0 right-0 z-[9999]"
              style={{ top: `var(--gw-header-h, ${headerHeight}px)` }}
            >
              <div
                ref={radioBarRef}
                className="bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-400 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 border-b border-zinc-500/50 shadow-lg"
                style={{
                  background: 'linear-gradient(180deg, #d4d4d8 0%, #a1a1aa 50%, #71717a 100%)',
                }}
              >
                <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    
                    {/* Power/Close Button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-6 h-6 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 border border-zinc-500 shadow-inner flex items-center justify-center hover:from-zinc-500 hover:to-zinc-700 transition-all"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        isPlaying ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-zinc-400"
                      )} />
                    </button>

                    {/* Brand */}
                    <span className="text-[10px] font-bold tracking-widest text-zinc-700 dark:text-zinc-300 uppercase hidden sm:block">
                      GleeWorld
                    </span>

                    {/* Channel Preset Buttons */}
                    <div className="flex items-center gap-1">
                      {channels.slice(0, 6).map((channel, idx) => {
                        const isSelected = selectedChannel?.id === channel.id;
                        return (
                          <button
                            key={channel.id}
                            onClick={() => handleChannelChange(channel)}
                            disabled={isLoading}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[9px] sm:text-[10px] font-bold transition-all",
                              "bg-gradient-to-b border shadow-sm",
                              isSelected
                                ? "from-amber-400 to-amber-600 border-amber-700 text-amber-900 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                : "from-zinc-500 to-zinc-700 border-zinc-600 text-zinc-200 hover:from-zinc-400 hover:to-zinc-600"
                            )}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* LCD Display */}
                    <div className="flex-1 mx-2 sm:mx-4">
                      <div 
                        className="bg-[#1a2a1a] border-2 border-zinc-600 rounded px-2 py-1 shadow-inner"
                        style={{
                          background: 'linear-gradient(180deg, #0f1a0f 0%, #1a2a1a 50%, #0f1a0f 100%)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {isLive && (
                              <span className="text-red-400 text-[8px] font-mono animate-pulse">●REC</span>
                            )}
                            <div className="truncate">
                              <span className="text-[10px] sm:text-xs font-mono text-green-400 tracking-wide">
                                {currentTrack?.title || selectedChannel?.name || 'No Signal'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-400/70 flex-shrink-0">
                            <span className="text-[8px] font-mono">{listenerCount}</span>
                            <Users className="h-2.5 w-2.5" />
                          </div>
                        </div>
                        {currentTrack?.artist && (
                          <div className="text-[8px] sm:text-[9px] font-mono text-green-400/60 truncate">
                            {currentTrack.artist}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        togglePlayPause();
                      }}
                      disabled={isLoading || !isOnline}
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all",
                        "bg-gradient-to-b border shadow-md",
                        isPlaying
                          ? "from-green-500 to-green-700 border-green-800"
                          : "from-zinc-500 to-zinc-700 border-zinc-600 hover:from-zinc-400 hover:to-zinc-600"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-white ml-0.5" />
                      )}
                    </button>

                    {/* Volume Knob Section */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setVolume(isMuted ? 0.7 : 0);
                        }}
                        className="text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {isMuted ? (
                          <VolumeX className="h-3.5 w-3.5" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      
                      {/* Volume Knob Visual */}
                      <div 
                        className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 border-2 border-zinc-700 shadow-lg cursor-pointer"
                        style={{
                          background: 'radial-gradient(ellipse at 30% 30%, #a1a1aa 0%, #52525b 50%, #27272a 100%)',
                        }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const centerX = rect.left + rect.width / 2;
                          const centerY = rect.top + rect.height / 2;
                          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                          const normalizedAngle = ((angle + Math.PI) / (2 * Math.PI));
                          setVolume(Math.max(0, Math.min(1, normalizedAngle)));
                        }}
                      >
                        {/* Knob indicator line */}
                        <div 
                          className="absolute w-0.5 h-3 bg-zinc-300 left-1/2 -translate-x-1/2 top-1 rounded-full"
                          style={{
                            transformOrigin: 'center bottom',
                            transform: `translateX(-50%) rotate(${(volume - 0.5) * 270}deg)`,
                          }}
                        />
                        {/* Center cap */}
                        <div className="absolute inset-2 sm:inset-3 rounded-full bg-gradient-to-b from-zinc-500 to-zinc-700 border border-zinc-600" />
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 ml-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
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
