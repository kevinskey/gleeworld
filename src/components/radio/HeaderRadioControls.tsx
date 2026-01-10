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
import { RadioPresetButton } from './RadioPresetButton';
import { RadioChannelDrawer } from './RadioChannelDrawer';

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
                <div className="max-w-7xl mx-auto px-2 sm:px-3 py-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    
                    {/* Power/Close Button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-5 h-5 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 border border-zinc-500 shadow-inner flex items-center justify-center hover:from-zinc-500 hover:to-zinc-700 transition-all"
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        isPlaying ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-zinc-400"
                      )} />
                    </button>

                    {/* Brand */}
                    <span className="text-[8px] font-bold tracking-widest text-zinc-700 dark:text-zinc-300 uppercase hidden sm:block">
                      GleeWorld
                    </span>

                    {/* Dynamic Preset Buttons - Show user's configured presets */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5, 6].map((slotNumber) => {
                        const preset = presets.find(p => p.slot_number === slotNumber);
                        const channel = preset?.channel;
                        const isSelected = selectedChannel?.id === channel?.id;
                        
                        return (
                          <RadioPresetButton
                            key={slotNumber}
                            preset={preset}
                            slotNumber={slotNumber}
                            isSelected={isSelected}
                            isLoading={isLoading || presetsLoading}
                            onClick={() => {
                              if (channel) {
                                handleChannelChange(channel);
                              }
                            }}
                          />
                        );
                      })}
                      
                      {/* Channel Browser Drawer Button */}
                      <RadioChannelDrawer
                        channels={channels}
                        selectedChannel={selectedChannel}
                        presets={presets}
                        onChannelSelect={handleChannelChange}
                        onAddToPreset={setPresetSlot}
                        isPlaying={isPlaying}
                      />
                    </div>

                    {/* LCD Display */}
                    <div className="flex-1 mx-1 sm:mx-2">
                      <div 
                        className="bg-[#1a2a1a] border border-zinc-600 rounded px-1.5 py-0.5 shadow-inner"
                        style={{
                          background: 'linear-gradient(180deg, #0f1a0f 0%, #1a2a1a 50%, #0f1a0f 100%)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {isLive && (
                              <span className="text-red-400 text-[7px] font-mono animate-pulse">●</span>
                            )}
                            <span 
                              key={currentTrack?.title || 'no-track'}
                              className="text-[9px] sm:text-[10px] font-mono text-green-400 tracking-wide truncate"
                            >
                              {currentTrack?.title 
                                ? `${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ''}`
                                : selectedChannel?.name || 'No Signal'}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 text-green-400/70 flex-shrink-0">
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

                    {/* Volume Slider Section */}
                    <div className="flex items-center gap-1.5">
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
                      
                      {/* Volume Slider */}
                      <div 
                        className="relative w-16 sm:w-20 h-3 flex items-center cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const newVolume = Math.max(0, Math.min(1, x / rect.width));
                          setVolume(newVolume);
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
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-grab active:cursor-grabbing shadow-md"
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
