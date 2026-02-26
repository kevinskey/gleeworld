import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Radio, Play, Pause, Loader2 } from 'lucide-react';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels } from '@/hooks/useRadioChannels';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { cn } from '@/lib/utils';
import { HEADER_ICON_SIZES } from '@/components/layout/headerIconSizes';

export const HeaderRadioControls = () => {
  try {
    const { selectedChannel } = useRadioChannels();
    
    const { 
      isPlaying, 
      isLoading, 
      isOnline,
      togglePlayPause, 
    } = useRadioPlayer();

    const getTooltipText = () => {
      if (isLoading) return 'Loading...';
      if (!isOnline) return 'Radio offline';
      if (isPlaying) return 'Stop Radio';
      return 'Play GleeWorld Radio';
    };

    return (
      <EnhancedTooltip content={getTooltipText()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            togglePlayPause();
          }}
          disabled={isLoading || !isOnline}
          className={cn(
            `relative ${HEADER_ICON_SIZES.button} p-0 hover:bg-white/10 transition-colors rounded-full`,
            isPlaying && "bg-white/20"
          )}
          type="button"
        >
          {isLoading ? (
            <Loader2 className={cn(HEADER_ICON_SIZES.icon, "animate-spin")} />
          ) : isPlaying ? (
            <>
              <Radio className={HEADER_ICON_SIZES.icon} />
              {/* Green pulsing indicator when playing */}
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
            </>
          ) : (
            <Radio className={HEADER_ICON_SIZES.icon} />
          )}
        </Button>
      </EnhancedTooltip>
    );
  } catch (error) {
    console.error('HeaderRadioControls error:', error);
    return null;
  }
};
