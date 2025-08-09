import React from 'react';
import { Play, Pause, Volume2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';

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

  return (
    <div className="flex items-center gap-2">
      {/* Radio Button */}
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
        
        {/* Status Badge */}
        <Badge 
          variant={isOnline ? (isLive ? "default" : "secondary") : "outline"}
          className={`text-xs px-1 py-0 h-5 ${
            isLive ? "bg-red-500 hover:bg-red-600 text-white" : 
            isOnline ? "bg-green-500 hover:bg-green-600 text-white" : ""
          }`}
        >
          {isLive ? 'LIVE' : isOnline ? 'ON' : 'OFF'}
        </Badge>
      </Button>

      {/* Now Playing Info - Hidden on small screens */}
      {isOnline && currentTrack && (
        <div className="hidden lg:flex flex-col text-xs text-muted-foreground max-w-48 overflow-hidden">
          <span className="truncate font-medium">{currentTrack.title}</span>
          {currentTrack.artist && (
            <span className="truncate">{currentTrack.artist}</span>
          )}
        </div>
      )}
    </div>
  );
};