import React from 'react';
import { Play, Pause, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

export const HeaderRadioPlayer = () => {
  const { 
    isPlaying, 
    isLoading, 
    isLive, 
    isOnline,
    listenerCount, 
    currentTrack,
    togglePlayPause 
  } = useRadioPlayer();

  const tooltip = `Glee World Radio: ${isPlaying ? 'Pause' : 'Play'} • ${isLive ? 'LIVE' : isOnline ? 'Online' : 'Offline'}${currentTrack ? ` • ${currentTrack.title}${currentTrack.artist ? ' — ' + currentTrack.artist : ''}` : ''}`;

  return (
    <div className="flex items-center gap-2">
      <EnhancedTooltip content={tooltip}>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="relative flex items-center gap-2 px-3 py-2 h-auto bg-background/50 border hover:bg-primary/10"
          title={isPlaying ? 'Pause Radio' : 'Play Glee World Radio'}
        >
          <Radio className="w-4 h-4 text-primary" />
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
      </EnhancedTooltip>
    </div>
  );
};