import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface YouTubeAudioPlayerProps {
  videoId: string;
  startTime?: number;
  endTime?: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubeAudioPlayer = ({ videoId, startTime, endTime }: YouTubeAudioPlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (window.YT && containerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            start: startTime || 0,
            end: endTime || undefined,
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true);
              setDuration(event.target.getDuration());
              event.target.setVolume(volume);
            },
            onStateChange: (event: any) => {
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            },
          },
        });
      }
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Update time interval
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        
        // Auto-stop at end time if specified
        if (endTime && time >= endTime) {
          playerRef.current.pauseVideo();
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, startTime, endTime]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(startTime || 0);
    playerRef.current.playVideo();
  };

  const handleSeek = (value: number[]) => {
    if (!playerRef.current) return;
    const seekTime = value[0];
    playerRef.current.seekTo(seekTime);
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(newVolume);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = endTime || duration;
  const effectiveCurrentTime = Math.min(currentTime, effectiveDuration);

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Hidden YouTube player */}
      <div ref={containerRef} className="sr-only" />

      {/* Audio player UI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Audio from YouTube</span>
          {isReady && (
            <span>
              {formatTime(effectiveCurrentTime)} / {formatTime(effectiveDuration)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <Slider
          value={[effectiveCurrentTime]}
          max={effectiveDuration}
          step={0.1}
          onValueChange={handleSeek}
          disabled={!isReady}
          className="cursor-pointer"
        />

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            disabled={!isReady}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRestart}
            disabled={!isReady}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
