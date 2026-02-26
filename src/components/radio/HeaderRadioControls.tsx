import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Radio, Play, Pause, Loader2 } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels } from '@/hooks/useRadioChannels';
import { cn } from '@/lib/utils';

export const HeaderRadioControls = () => {
  try {
    const { selectedChannel } = useRadioChannels();
    
    const { 
      isPlaying, 
      isLoading, 
      isOnline,
      togglePlayPause, 
    } = useRadioPlayer();

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          togglePlayPause();
        }}
        disabled={isLoading || !isOnline}
        className={cn(
          "relative h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full transition-colors",
          "hover:bg-[hsl(var(--spelman-navy))]/10 text-[hsl(var(--spelman-navy))]",
          isPlaying && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        )}
        type="button"
        title={isLoading ? 'Loading...' : !isOnline ? 'Radio offline' : isPlaying ? 'Stop Radio' : 'Play Radio'}
      >
        {isLoading ? (
          <Loader2 className="h-[18px] w-[18px] sm:h-5 sm:w-5 animate-spin" />
        ) : isPlaying ? (
          <>
            <Radio className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          </>
        ) : (
          <Radio className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
        )}
      </Button>
    );
  } catch (error) {
    console.error('HeaderRadioControls error:', error);
    return null;
  }
};
