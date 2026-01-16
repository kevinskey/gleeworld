import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Radio, Play, Pause, Volume2, VolumeX, Users, X, ChevronUp, Music2, Church, Sparkles, Check, Bell, MapPin, Mic, Disc, Clock, Music, Loader2, Shield, Heart, Star, Globe, Film, SkipForward, SkipBack } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels, type RadioChannel } from '@/hooks/useRadioChannels';
import { useUserRadioPresets } from '@/hooks/useUserRadioPresets';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { HEADER_ICON_SIZES } from '@/components/layout/headerIconSizes';
import { RadioChannelSpinner } from './RadioChannelSpinner';

// CSS class added to body when radio bar is open - used by other components to add padding
const RADIO_OPEN_CLASS = 'radio-bar-open';
const RADIO_OPEN_KEY = 'gleeworld-radio-open';

export const HeaderRadioControls = () => {
  try {
    // Persist radio bar open state across page navigation
    const [isOpen, setIsOpen] = useState(() => {
      const saved = localStorage.getItem(RADIO_OPEN_KEY);
      return saved === 'true';
    });
    const [headerHeight, setHeaderHeight] = useState(0);
    const { channels, selectedChannel, selectChannel, isLoading: channelsLoading } = useRadioChannels();
    const { presets, setPresetSlot, isLoading: presetsLoading } = useUserRadioPresets(channels);
    const { themeName } = useTheme();
    const radioBarRef = useRef<HTMLDivElement>(null);

    // Persist open state to localStorage
    useEffect(() => {
      localStorage.setItem(RADIO_OPEN_KEY, isOpen ? 'true' : 'false');
    }, [isOpen]);
    
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
      skipTrack,
    } = useRadioPlayer();

    const [isSkipping, setIsSkipping] = useState(false);
    const [channelNotification, setChannelNotification] = useState<string | null>(null);

    const handleSkipTrack = async () => {
      if (isSkipping || !isPlaying) return;
      setIsSkipping(true);
      try {
        await skipTrack();
      } finally {
        // Reset after a short delay to prevent rapid clicking
        setTimeout(() => setIsSkipping(false), 2000);
      }
    };

    const isMuted = volume === 0;

    const handleChannelChange = async (channel: RadioChannel) => {
      selectChannel(channel);
      
      // Switch to the channel's stream URL to play that station
      if (channel.stream_url) {
        await switchStream(channel.stream_url, channel.name);
        // Show inline notification instead of toast
        setChannelNotification(`Switched to ${channel.name}`);
        setTimeout(() => setChannelNotification(null), 3000);
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
                <div className="max-w-7xl mx-auto px-2 sm:px-3 py-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                    
                    {/* Power/Close Button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-5 h-5 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 border border-zinc-500 shadow-inner flex items-center justify-center hover:from-zinc-500 hover:to-zinc-700 transition-all flex-shrink-0"
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        isPlaying ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-zinc-400"
                      )} />
                    </button>

                    {/* Brand - Hidden on mobile */}
                    <span className="text-[8px] font-bold tracking-widest text-zinc-700 dark:text-zinc-300 uppercase hidden md:block flex-shrink-0">
                      GleeWorld
                    </span>

                    {/* Channel Spinner - Replaces preset buttons */}
                    <RadioChannelSpinner
                      channels={channels}
                      selectedChannel={selectedChannel}
                      onChannelSelect={handleChannelChange}
                      isPlaying={isPlaying}
                      isLoading={channelsLoading}
                    />

                    {/* LCD Display - Give it min-width on mobile */}
                    <div className="flex-1 min-w-[80px] sm:min-w-[100px] mx-0.5 sm:mx-2">
                      <div 
                        className="bg-[#1a2a1a] border border-zinc-600 rounded px-1 sm:px-1.5 py-0.5 shadow-inner"
                        style={{
                          background: 'linear-gradient(180deg, #0f1a0f 0%, #1a2a1a 50%, #0f1a0f 100%)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1">
                            {isLive && (
                              <span className="text-red-400 text-[7px] font-mono animate-pulse flex-shrink-0">●</span>
                            )}
                            <span 
                              key={`${currentTrack?.title || 'no-track'}-${currentTrack?.artist || ''}`}
                              className="text-[8px] sm:text-[10px] font-mono text-green-400 tracking-wide truncate"
                            >
                              {currentTrack?.title 
                                ? `${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ''}`
                                : selectedChannel?.name || 'No Signal'}
                            </span>
                          </div>
                          {/* Hide listener count on very small screens */}
                          <div className="hidden xs:flex items-center gap-0.5 text-green-400/70 flex-shrink-0">
                            <span className="text-[7px] font-mono">{listenerCount}</span>
                            <Users className="h-2 w-2" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transport Controls: Rewind, Play/Pause, Skip */}
                    <div className="flex items-center gap-0.5">
                      {/* Rewind/Previous Button - restarts stream to refresh */}
                      <EnhancedTooltip content="Restart stream">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // Restart the stream to get fresh content
                            if (selectedChannel?.stream_url) {
                              switchStream(selectedChannel.stream_url);
                            }
                          }}
                          disabled={!isPlaying || isLoading}
                          className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all",
                            "bg-gradient-to-b border shadow-md",
                            isPlaying
                              ? "from-zinc-400 to-zinc-600 border-zinc-500 hover:from-zinc-300 hover:to-zinc-500"
                              : "from-zinc-500 to-zinc-700 border-zinc-600 opacity-50 cursor-not-allowed"
                          )}
                        >
                          <SkipBack className="h-2.5 w-2.5 text-white" />
                        </button>
                      </EnhancedTooltip>

                      {/* Play/Pause Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          togglePlayPause();
                        }}
                        disabled={isLoading || !isOnline}
                        className={cn(
                          "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all",
                          "bg-gradient-to-b border shadow-md",
                          isPlaying
                            ? "from-green-500 to-green-700 border-green-800"
                            : "from-zinc-500 to-zinc-700 border-zinc-600 hover:from-zinc-400 hover:to-zinc-600"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="h-3 w-3 text-white" />
                        ) : (
                          <Play className="h-3 w-3 text-white ml-0.5" />
                        )}
                      </button>

                      {/* Skip Forward Button */}
                      <EnhancedTooltip content="Skip to next track">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleSkipTrack();
                          }}
                          disabled={!isPlaying || isLoading || isSkipping}
                          className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all",
                            "bg-gradient-to-b border shadow-md",
                            isPlaying && !isSkipping
                              ? "from-zinc-400 to-zinc-600 border-zinc-500 hover:from-zinc-300 hover:to-zinc-500"
                              : "from-zinc-500 to-zinc-700 border-zinc-600 opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isSkipping ? (
                            <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                          ) : (
                            <SkipForward className="h-2.5 w-2.5 text-white" />
                          )}
                        </button>
                      </EnhancedTooltip>
                    </div>

                    {/* Volume Slider Section - Hidden on very small screens */}
                    <div className="hidden xs:flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setVolume(isMuted ? 0.7 : 0);
                        }}
                        className="text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        {isMuted ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </button>
                      
                      {/* Volume Slider - Narrower on small screens */}
                      <div 
                        className="relative w-12 sm:w-16 md:w-20 h-3 flex items-center cursor-pointer touch-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const newVolume = Math.max(0, Math.min(1, x / rect.width));
                          setVolume(newVolume);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const slider = e.currentTarget;
                          const rect = slider.getBoundingClientRect();
                          
                          const updateVolume = (clientX: number) => {
                            const x = clientX - rect.left;
                            const newVolume = Math.max(0, Math.min(1, x / rect.width));
                            setVolume(newVolume);
                          };
                          
                          // Set initial position
                          if (e.touches[0]) {
                            updateVolume(e.touches[0].clientX);
                          }
                          
                          const onTouchMove = (moveEvent: TouchEvent) => {
                            if (moveEvent.touches[0]) {
                              updateVolume(moveEvent.touches[0].clientX);
                            }
                          };
                          
                          const onTouchEnd = () => {
                            document.removeEventListener('touchmove', onTouchMove);
                            document.removeEventListener('touchend', onTouchEnd);
                          };
                          
                          document.addEventListener('touchmove', onTouchMove, { passive: false });
                          document.addEventListener('touchend', onTouchEnd);
                        }}
                      >
                        {/* Slider track - brushed metal groove */}
                        <div 
                          className="absolute inset-x-0 h-1.5 rounded-full border border-zinc-500/50 pointer-events-none"
                          style={{
                            background: 'linear-gradient(180deg, #3f3f46 0%, #52525b 50%, #71717a 100%)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                          }}
                        >
                          {/* Active fill */}
                          <div 
                            className="h-full rounded-full"
                            style={{
                              width: `${volume * 100}%`,
                              background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
                            }}
                          />
                        </div>
                        
                        {/* Silver Handle */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-grab active:cursor-grabbing shadow-md touch-none"
                          style={{
                            left: `calc(${volume * 100}% - 6px)`,
                            background: 'linear-gradient(180deg, #f4f4f5 0%, #d4d4d8 30%, #a1a1aa 70%, #71717a 100%)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.8)',
                            border: '1px solid #52525b',
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const slider = e.currentTarget.parentElement;
                            if (!slider) return;
                            
                            const updateVolume = (clientX: number) => {
                              const rect = slider.getBoundingClientRect();
                              const x = clientX - rect.left;
                              const newVolume = Math.max(0, Math.min(1, x / rect.width));
                              setVolume(newVolume);
                            };
                            
                            const onMouseMove = (moveEvent: MouseEvent) => {
                              updateVolume(moveEvent.clientX);
                            };
                            
                            const onMouseUp = () => {
                              document.removeEventListener('mousemove', onMouseMove);
                              document.removeEventListener('mouseup', onMouseUp);
                            };
                            
                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const slider = e.currentTarget.parentElement;
                            if (!slider) return;
                            
                            const updateVolume = (clientX: number) => {
                              const rect = slider.getBoundingClientRect();
                              const x = clientX - rect.left;
                              const newVolume = Math.max(0, Math.min(1, x / rect.width));
                              setVolume(newVolume);
                            };
                            
                            const onTouchMove = (moveEvent: TouchEvent) => {
                              if (moveEvent.touches[0]) {
                                updateVolume(moveEvent.touches[0].clientX);
                              }
                            };
                            
                            const onTouchEnd = () => {
                              document.removeEventListener('touchmove', onTouchMove);
                              document.removeEventListener('touchend', onTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', onTouchMove, { passive: false });
                            document.addEventListener('touchend', onTouchEnd);
                          }}
                        />
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  {/* Inline channel change notification */}
                  {channelNotification && (
                    <div className="mt-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md text-green-400 text-xs font-medium text-center animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <Check className="h-3 w-3" />
                        <span>{channelNotification}</span>
                      </div>
                    </div>
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
