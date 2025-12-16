import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';

export const HeaderRadioPlayer = () => {
  const {
    isPlaying,
    isLoading,
    togglePlayPause,
    resetAudio,
  } = useRadioPlayer();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={togglePlayPause}
      onContextMenu={(e) => {
        e.preventDefault();
        resetAudio();
      }}
      disabled={isLoading}
      className="bg-background/50 border hover:bg-primary/10"
      title={isPlaying ? 'Pause Radio' : 'Play Radio'}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
    </Button>
  );
};