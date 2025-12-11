import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  Music,
  Youtube,
  Upload,
  StopCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AudioCompanionProps {
  onClose: () => void;
  className?: string;
}

type AudioSource = 'youtube' | 'file' | null;

export const AudioCompanion: React.FC<AudioCompanionProps> = ({ onClose, className }) => {
  const [audioSource, setAudioSource] = useState<AudioSource>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audioCompanionVolume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    // Load the API script if not already present
    if (!window.YT && !document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      console.log('[AudioCompanion] Loading YouTube IFrame API');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (audioSource !== 'youtube' || !youtubeVideoId) return;

    let mounted = true;
    let pollInterval: number | null = null;
    
    setIsLoading(true);
    setPlayerReady(false);

    const initPlayer = () => {
      if (!mounted || !youtubeContainerRef.current) return;
      
      console.log('[AudioCompanion] Initializing YouTube player for:', youtubeVideoId);

      // Destroy existing player
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          console.log('[AudioCompanion] Error destroying previous player:', e);
        }
        youtubePlayerRef.current = null;
      }

      // Create a fresh div for the player
      const container = youtubeContainerRef.current;
      container.innerHTML = '';
      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-audio-companion-' + Date.now();
      container.appendChild(playerDiv);

      youtubePlayerRef.current = new window.YT.Player(playerDiv, {
        height: '100',
        width: '178',
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            console.log('[AudioCompanion] YouTube player ready');
            if (!mounted) return;
            setIsLoading(false);
            setPlayerReady(true);
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
            const dur = event.target.getDuration() || 0;
            setDuration(dur);
            // Try to play - may be blocked by browser
            try {
              event.target.playVideo();
            } catch (e) {
              console.log('[AudioCompanion] Autoplay blocked:', e);
            }
          },
          onStateChange: (event: any) => {
            console.log('[AudioCompanion] YouTube state change:', event.data);
            if (!mounted) return;
            if (event.data === window.YT?.PlayerState?.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              setDuration(event.target.getDuration() || 0);
            } else if (event.data === window.YT?.PlayerState?.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT?.PlayerState?.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
            } else if (event.data === window.YT?.PlayerState?.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event: any) => {
            console.error('[AudioCompanion] YouTube player error:', event.data);
            if (!mounted) return;
            setIsLoading(false);
          }
        },
      });
    };

    // Poll for YouTube API readiness
    const tryInit = () => {
      if (window.YT?.Player) {
        console.log('[AudioCompanion] YouTube API ready, initializing player');
        if (pollInterval) clearInterval(pollInterval);
        setTimeout(initPlayer, 100);
      }
    };

    // If API already loaded, init immediately
    if (window.YT?.Player) {
      setTimeout(initPlayer, 100);
    } else {
      // Poll every 100ms for API readiness (max 5 seconds)
      let attempts = 0;
      pollInterval = window.setInterval(() => {
        attempts++;
        if (window.YT?.Player) {
          tryInit();
        } else if (attempts > 50) {
          console.error('[AudioCompanion] YouTube API failed to load after 5 seconds');
          if (pollInterval) clearInterval(pollInterval);
          setIsLoading(false);
        }
      }, 100);
    }

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {}
        youtubePlayerRef.current = null;
      }
    };
  }, [audioSource, youtubeVideoId]);

  // Update progress for YouTube
  useEffect(() => {
    if (audioSource === 'youtube' && isPlaying && youtubePlayerRef.current) {
      progressIntervalRef.current = window.setInterval(() => {
        if (youtubePlayerRef.current?.getCurrentTime) {
          setCurrentTime(youtubePlayerRef.current.getCurrentTime());
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioSource, isPlaying]);

  // Save volume to localStorage
  useEffect(() => {
    localStorage.setItem('audioCompanionVolume', volume.toString());
  }, [volume]);

  const handleYouTubeSubmit = useCallback(() => {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (videoId) {
      setYoutubeVideoId(videoId);
      setAudioSource('youtube');
      setAudioFileName(null);
      setShowSourcePicker(false);
    }
  }, [youtubeUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        audioRef.current.play();
      }
      setAudioSource('file');
      setAudioFileName(file.name);
      setYoutubeVideoId(null);
      setIsPlaying(true);
      setPlayerReady(true);
      setIsLoading(false);
      setShowSourcePicker(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    console.log('[AudioCompanion] togglePlayPause called', { 
      audioSource, 
      isPlaying, 
      hasYoutubePlayer: !!youtubePlayerRef.current,
      playerState: youtubePlayerRef.current?.getPlayerState?.()
    });
    
    if (audioSource === 'youtube') {
      if (!youtubePlayerRef.current) {
        console.warn('[AudioCompanion] YouTube player not ready yet');
        return;
      }
      try {
        if (isPlaying) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      } catch (e) {
        console.error('[AudioCompanion] Error controlling YouTube player:', e);
      }
    } else if (audioSource === 'file' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [audioSource, isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [audioSource]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(newVolume * 100);
      if (newVolume === 0) {
        youtubePlayerRef.current.mute();
      } else {
        youtubePlayerRef.current.unMute();
      }
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, [audioSource]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      if (newMuted) {
        youtubePlayerRef.current.mute();
      } else {
        youtubePlayerRef.current.unMute();
      }
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  }, [audioSource, isMuted]);

  const stopAndClear = useCallback(() => {
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.stopVideo();
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioSource(null);
    setYoutubeVideoId(null);
    setYoutubeUrl('');
    setAudioFileName(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioSource]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);

  return (
    <div className={cn("flex items-center gap-1.5 bg-card/95 backdrop-blur border border-border p-1 shadow-lg", className)}>
      {/* Hidden YouTube player - needs minimum size to play, use opacity instead of visibility for browser compatibility */}
      <div 
        ref={youtubeContainerRef} 
        className="fixed w-[178px] h-[100px]"
        style={{ 
          opacity: 0, 
          pointerEvents: 'none',
          top: '-9999px',
          left: '-9999px',
          zIndex: -1
        }}
      />
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Music icon / Source picker */}
      <Popover open={showSourcePicker} onOpenChange={setShowSourcePicker}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Select audio source"
          >
            {audioSource === 'youtube' ? (
              <Youtube className="h-4 w-4 text-red-500" />
            ) : audioSource === 'file' ? (
              <Music className="h-4 w-4 text-primary" />
            ) : (
              <Music className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Select Audio Source</div>
            <div className="flex gap-2">
              <Input
                placeholder="Paste YouTube URL..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleYouTubeSubmit()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleYouTubeSubmit}
                disabled={!youtubeUrl}
                className="h-8 px-2"
              >
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">or</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Audio
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Play/Pause */}
      <Button
        size="sm"
        variant="ghost"
        onClick={togglePlayPause}
        disabled={!audioSource || (audioSource === 'youtube' && !playerReady)}
        className="h-8 w-8 p-0"
        title={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress bar - only show when audio is loaded */}
      {audioSource && (
        <>
          <span className="text-xs tabular-nums text-muted-foreground w-10">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-24"
          />
          <span className="text-xs tabular-nums text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </>
      )}

      {/* Volume */}
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleMute}
        className="h-8 w-8 p-0"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>

      <Slider
        value={[isMuted ? 0 : volume]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={handleVolumeChange}
        className="w-16"
      />

      {/* Stop/Clear */}
      {audioSource && (
        <Button
          size="sm"
          variant="ghost"
          onClick={stopAndClear}
          className="h-8 w-8 p-0"
          title="Stop and clear"
        >
          <StopCircle className="h-4 w-4" />
        </Button>
      )}

      {/* Close */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
        className="h-8 w-8 p-0"
        title="Close audio companion"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AudioCompanion;
