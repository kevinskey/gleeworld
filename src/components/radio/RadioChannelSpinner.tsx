import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Radio, Music2, Church, Sparkles, Bell, MapPin, Mic, Disc, Clock, Music, Users, Shield, Heart, Star, Globe, Film, Play } from 'lucide-react';
import { type RadioChannel } from '@/hooks/useRadioChannels';
import { cn } from '@/lib/utils';

interface RadioChannelSpinnerProps {
  channels: RadioChannel[];
  selectedChannel: RadioChannel | null;
  onChannelSelect: (channel: RadioChannel) => void;
  isPlaying: boolean;
  isLoading?: boolean;
}

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

export const RadioChannelSpinner: React.FC<RadioChannelSpinnerProps> = ({
  channels,
  selectedChannel,
  onChannelSelect,
  isPlaying,
  isLoading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (selectedChannel) {
      const idx = channels.findIndex(c => c.id === selectedChannel.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  
  const spinnerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);

  // Sync currentIndex when selectedChannel changes externally
  useEffect(() => {
    if (selectedChannel) {
      const idx = channels.findIndex(c => c.id === selectedChannel.id);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  }, [selectedChannel, channels]);

  const goToChannel = (index: number) => {
    if (channels.length === 0) return;
    
    // Wrap around
    let newIndex = index;
    if (newIndex < 0) newIndex = channels.length - 1;
    if (newIndex >= channels.length) newIndex = 0;
    
    setCurrentIndex(newIndex);
    onChannelSelect(channels[newIndex]);
  };

  const handlePrev = () => goToChannel(currentIndex - 1);
  const handleNext = () => goToChannel(currentIndex + 1);

  // Mouse/Touch drag handling
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setDragDelta(0);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const delta = startY - clientY;
    setDragDelta(delta);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If dragged more than 20px, change channel
    if (Math.abs(dragDelta) > 20) {
      if (dragDelta > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setDragDelta(0);
  };

  // Wheel handling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  // Get visible channels (prev, current, next) for the spinner display
  const getVisibleChannels = () => {
    if (channels.length === 0) return [];
    if (channels.length === 1) return [{ channel: channels[0], position: 'center' as const }];
    
    const prevIndex = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    const nextIndex = currentIndex === channels.length - 1 ? 0 : currentIndex + 1;
    
    return [
      { channel: channels[prevIndex], position: 'top' as const },
      { channel: channels[currentIndex], position: 'center' as const },
      { channel: channels[nextIndex], position: 'bottom' as const },
    ];
  };

  const visibleChannels = getVisibleChannels();
  const currentChannel = channels[currentIndex];

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center px-2 py-1 text-zinc-500 text-[9px]">
        No channels
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Spinner Container */}
      <div
        ref={spinnerRef}
        className={cn(
          "relative flex flex-col items-center select-none",
          "bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900",
          "border border-zinc-600 rounded-lg shadow-inner",
          "overflow-hidden cursor-ns-resize",
          isLoading && "opacity-50 pointer-events-none"
        )}
        style={{ width: '120px', height: '52px' }}
        onWheel={handleWheel}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
      >
        {/* Up Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute top-0 left-0 right-0 h-4 flex items-center justify-center bg-gradient-to-b from-zinc-600/80 to-transparent z-10 hover:from-zinc-500/80 transition-colors"
        >
          <ChevronUp className="h-3 w-3 text-zinc-400" />
        </button>

        {/* Spinner Display */}
        <div 
          className="flex flex-col items-center justify-center h-full py-1"
          style={{
            transform: isDragging ? `translateY(${-dragDelta * 0.3}px)` : 'translateY(0)',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {visibleChannels.map(({ channel, position }) => {
            const Icon = getChannelIcon(channel.icon);
            const isCenter = position === 'center';
            const isSelected = selectedChannel?.id === channel.id;
            
            return (
              <div
                key={`${channel.id}-${position}`}
                className={cn(
                  "flex items-center gap-1.5 px-2 w-full transition-all duration-200",
                  position === 'top' && "opacity-40 scale-90 -mb-0.5",
                  position === 'center' && "opacity-100 scale-100",
                  position === 'bottom' && "opacity-40 scale-90 -mt-0.5"
                )}
                style={{
                  height: position === 'center' ? '28px' : '12px',
                }}
              >
                {isCenter && (
                  <>
                    {/* Icon */}
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      isSelected && isPlaying ? "bg-amber-500/30" : "bg-zinc-700"
                    )}>
                      <Icon className={cn(
                        "h-3 w-3",
                        isSelected && isPlaying ? "text-amber-300" : "text-zinc-300"
                      )} />
                    </div>

                    {/* Channel Name */}
                    <span className={cn(
                      "text-[10px] font-medium truncate flex-1",
                      isSelected && isPlaying ? "text-amber-300" : "text-zinc-200"
                    )}>
                      {channel.name}
                    </span>

                    {/* Playing indicator */}
                    {isSelected && isPlaying && (
                      <Play className="h-2.5 w-2.5 text-green-400 flex-shrink-0 fill-green-400" />
                    )}
                  </>
                )}
                {!isCenter && (
                  <span className="text-[8px] text-zinc-500 truncate w-full text-center">
                    {channel.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Down Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center bg-gradient-to-t from-zinc-600/80 to-transparent z-10 hover:from-zinc-500/80 transition-colors"
        >
          <ChevronDown className="h-3 w-3 text-zinc-400" />
        </button>

        {/* Center highlight line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[28px] border-t border-b border-amber-500/30 pointer-events-none" />
      </div>

      {/* Channel Counter */}
      <div className="flex flex-col items-center text-zinc-500">
        <span className="text-[8px] font-mono leading-none">{currentIndex + 1}</span>
        <div className="w-3 h-px bg-zinc-600" />
        <span className="text-[8px] font-mono leading-none">{channels.length}</span>
      </div>
    </div>
  );
};
